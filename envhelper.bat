prompt $g
cd..
cd PosData
REM git checkout -- store-db.xml
REM git checkout -- screen.xml
REM git checkout -- product-db.xml
REM git checkout -- workflow.xml
REM git checkout -- names-db.xml

git checkout -- "_POS041 CSO_pos-db.xml"
git checkout -- "_WAYSTATION_pos-db.xml"
git show HEAD^:./store-db.xml > store-db-dev.xml

mkdir images

cd nps
git checkout -- BCEvents.nps
git checkout -- BusinessComponentsCSONGK.nps
REM git checkout -- BusinessComponentsCSOLocal.nps
git checkout -- BCEventsCSO.nps
git checkout -- BusinessComponentsCSO.nps
git checkout -- BCEventsCSO.nps
git checkout -- CSL_CSO.nps

cd..
cd..
cd bat
cd envmerger
node index.js
cd..
fart -r "..\PosData\store-db.xml" "233.0.0.17" " "233.0.0.233"
prompt $p