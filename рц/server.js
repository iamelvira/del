const sqlite = require('sqlite3').verbose();
var events = require('events');
var util = require('util');
var fs = require('fs');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var jsonParser = bodyParser.json();
app.set('view engine', 'ejs');

function sqlIns(table,keys,vals){
    if( typeof keys==="string"){
        return 'INSERT into '+table+'('+keys+')values("'+vals+'")';
    }else{
        let k=keys.join(',');
        let v=vals.join('","');
        return 'INSERT into '+table+'('+k+')values("'+v+'")';
    }
}

function postSql(obj){
    let db = new sqlite.Database('delivery.db');

    db.all('SELECT * FROM users WHERE name="'+obj.userName+'"', [], (err,rows)=>{
        if(err){console.log(err.message);}
        if (!rows.length){
            db.run(sqlIns('users','name',obj.userName));
        };
        db.all('SELECT id FROM users WHERE name="'+obj.userName+'"', [], (err,rows)=>{
            if(err){console.log(err.message);}
            var userID = rows[0].id; 
            db.all('SELECT * FROM addresses WHERE adds="'+obj.addressesAdds+'"', [], (err,rows)=>{
                if(err){console.log(err.message);}
                if (!rows.length){
                    db.run(sqlIns('addresses','adds',obj.addressesAdds)); 
                };
                db.all('SELECT id FROM addresses WHERE adds="'+obj.addressesAdds+'"', [], (err, rows)=>{
                    if(err){console.log(err.message);}
                    var addID= rows.pop().id;
                    db.run(sqlIns('parcels',['content','userId','addressId','delivered'],[obj.parcelContent,userID,addID,'false']));
                });
            });
        }); 
    });
    db.close();
}




app.get('/', function(req, res){
    res.render('index');
});


app.post('/', urlencodedParser, function(req, res){
    if (!req.body.userName||!req.body.parcelContent||!req.body.addressesAdds){}
    else{
        console.log(req.body);
        // postSql(req.body);
        res.render('index');
    };
});


app.get('/del', function () {
    console.log('req');
});


app.listen(3000);



// function droneSelect(db,ad,us,pack,id){
//     db.all('SELECT name FROM drones WHERE isFree ="true"', [], (err,drones)=>{
//         if(err){console.log(err.message);}
//         (drones.length-1)<id?id=0:id;
//         let drone=drones[id].name;
//         deliveryEmulate(drone,db,'false');
//         let start=`${drone} is delivering ${pack} for ${us} to ${ad}`;
//         console.log(start);
//         deliveryEmulate(drone,db,'true');
//     });
// }



// function deliveryEmulate(drone,db,bool){
//     drone.isFree=bool;
//     db.all('UPDATE drones SET isFree = "'+bool+'" WHERE id = '+drone.id);
// }



// function parcelect(){
//     let db = new sqlite.Database('delivery.db');

//     db.all('SELECT * FROM parcels', [], (err,pack)=>{
//         if(err){console.log(err.message);};
//         const len=pack.length;
//         for(let i=0; i<len; i++){
//             let parcel=pack[i].content;
//             db.all('SELECT adds FROM addresses WHERE id = '+pack[i].addressId, [], (err,adds)=>{
//                     if(err){console.log(err.message);}
//                     let address=adds[0].adds;
//                     db.all('SELECT name FROM users WHERE id = '+pack[i].userId, [], (err,users)=>{
//                         if(err){console.log(err.message);}
//                         let user=users[0].name;
//                         droneSelect(db,address,user,parcel,i);
//                     });
//                 });
//         };
//     });
//     db.close();
// }
// parcelect();

function parcelect(){
    const dbObj={};
    let db = new sqlite.Database('delivery.db');

    db.all('SELECT * FROM parcels', [], (err,pack)=>{
        if(err){console.log(err.message);};
        dbObj.parcels=pack;
        db.all('SELECT * FROM addresses', [], (err,adds)=>{
            if(err){console.log(err.message);}
            dbObj.adds=adds;
            db.all('SELECT * FROM users', [], (err,users)=>{
                if(err){console.log(err.message);}
                dbObj.users=users;
                db.all('SELECT * FROM drones', [], (err,drones)=>{
                    if(err){console.log(err.message);}
                    // oooooooooooooooooo
                    dbObj.drones=drones;
                    let i=0;
                    const len= pack.length;

                    function wDrone (){
                        
                        let wd=round(drones,len);
                        wd.isFree=false;
                        const wdId=wd.id;
                        drones.map(function(drone){
                            drone.id==wdId?drone.isFree=false:drone;
                        })
                        del (users, drones, pack, adds, wd, i);
                        i++;
                    };
                    console.log(i,len);
                    if (i>=len){
                    clearInterval(emulate);
                       }
                    let emulate=function(msec){
                        setInterval(wDrone,msec);
                    }
                    emulate(1000);

                });
            });
        });
    });

    db.close();
}

parcelect();

function del (users, drones, pack, adds, wdrone,i){
       if(pack[i]){
        if(pack[i].delivered==='false'){
            pack[i].delivered=true;
            console.log(`${wdrone.name} delivering ${pack[i].content} 
                to ${adds.find(adds=>adds.id==pack[i].addressId).adds}
                for ${users.find(user=>user.id==pack[i].userId).name}`);
            setTimeout(()=>{drones.find(drone=>drone.id==wdrone.id).isFree=true;},2000)
           }
       }else{}
}



function round(arr,k){
    for (let i=0;i<k;i++){
        if(arr[i].isFree){
            return arr[i];
        }
    }

}

