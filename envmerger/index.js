'use strict'
var JiraClient = require('jira-connector');

var username = process.argv[3];
var password = process.argv[4];

var auth = 'Basic ' + new Buffer(username + ":" + password).toString("base64");

var jira = new JiraClient({
    host: 'jira.rdisoftware.com',
    basic_auth: {
        username: username,
        password: password
    }
});

var FileDownload = require('./core/file-download');
var filedownload = new FileDownload();
var request = require('request');

function download(data) {
    
    var options = {
        url: data.content,
        headers: {
            'Authorization': auth
        }
    };

    console.log("downloading file " + data.filename);

    return filedownload.download(options, data.filename)
    .then(function(id){
        console.log('file %s downloaded', id);
    })
    .catch(function(err){
        console.log('file could not be downloaded');
        console.log(err.stack);
    });

}


var downloadAttachments = function (issueKey) {

    let filter = function (key) { return { issueKey: key } };
    let url = function(data) { return { url: data.content, headers: { 'Authorization': auth }}};

    return jira.issue.getIssue({ issueKey: issueKey })
        .then(issue => { return Promise.all(issue.fields.customfield_12408.map(filter)) })
        .then(data => { return Promise.all(data.map(function (x) { return jira.issue.getIssue(x) })); })
        .then(data => { return Promise.all(data.map(_ => _.fields.attachment)) })
        .then(data => { return [].concat.apply([], data) })
        .then(data => { return Promise.all(data.map(function (x) { return jira.attachment.getAttachment({ attachmentId: x.id }) })) })
        .then(data => { return Promise.all(data.map(download)) });
}


downloadAttachments(process.argv[2]);


function downloadEnv() {

    var xml2js = require('xml2js');
    var fs = require('fs');
    var parser = new xml2js.Parser();

    fs.readFile('../../PosData/stt.xml', 'utf8', function (err, stt) {
        parser.parseString(stt, function (err, sttparsed) {
            console.log('setting log files size to 25MB');
            sttparsed.StdLogTrace.FileSize[0] = '25';
            var builder = new xml2js.Builder();
            var xml = builder.buildObject(sttparsed);
            fs.writeFile('../../PosData/stt.xml', xml, function (err) {
                console.log("stt modified");
            });
        });
    });

    fs.readFile('../../PosData/store-db.xml', 'utf8', function (err, storeprod) {
        fs.readFile('../../PosData/store-db-dev.xml', 'utf8', function (errdev, storedev) {
            parser.parseString(storeprod, function (err, storeprodparsed) {
                parser.parseString(storedev, function (err, storedevparsed) {

                    console.log('importing store profile');
                    storedevparsed.Document.StoreDB[0].StoreProfile = storeprodparsed.Document.StoreDB[0].StoreProfile;

                    console.log('importing tax table');
                    storedevparsed.Document.StoreDB[0].TaxTable = storeprodparsed.Document.StoreDB[0].TaxTable;

                    console.log('importing day parts');
                    storedevparsed.Document.StoreDB[0].DayParts = storeprodparsed.Document.StoreDB[0].DayParts;

                    console.log('importing categories');
                    if (storeprodparsed.Document.StoreDB[0].Categories)
                        storedevparsed.Document.StoreDB[0].Categories = storeprodparsed.Document.StoreDB[0].Categories;

                    console.log('importing cso user interface');
                    // find index pos config has in dev config
                    var posDevConf = storedevparsed.Document.Configurations[0].Configuration.find((conf) => conf.$.type == "POS");
                    var index = storedevparsed.Document.Configurations[0].Configuration.indexOf(posDevConf);
                    // find pos config in prod config
                    var posProdConf = storeprodparsed.Document.Configurations[0].Configuration.find((conf) => conf.$.type == "POS");
                    // replace pos config from dev with prod config
                    storedevparsed.Document.Configurations[0].Configuration.splice(index, 1, posProdConf);

                    console.log('saving storedb');
                    var builder = new xml2js.Builder();
                    var xml = builder.buildObject(storedevparsed);
                    fs.writeFile('../../PosData/store-db.xml', xml, function (err) {
                        console.log("storedb imported");
                    });

                    console.log('importing images');
                    var csoUserInterface = posProdConf.Section.find((conf) => conf.$.name == "CSO.UserInterface");
                    var imageSource = csoUserInterface.Parameter.find(param => param.$.name == "imagesSource");
                    var fullpath = imageSource.$.value.split('\\');
                    var filename = fullpath[fullpath.length - 1];
                    if (filename) {
                        fs.createReadStream('\\\\Storage\\Develop\\__KIOSK\\DevEnv\\TestEnvironment\\PosData\\images\\' + filename).pipe(fs.createWriteStream('../../PosData/images/' + filename));
                    }
                })
            });
        })
    });
}

