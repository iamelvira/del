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






function parcelect(){
    const dbObj={};
    let arr;
    let db = new sqlite.Database('delivery.db');

    let a=db.all('SELECT * FROM parcels WHERE delivered="false"', [], function e(err,pack){
        if(err){console.log(err.message);};
        db.all('SELECT * FROM addresses', [], (err,adds)=>{
            if(err){console.log(err.message);}
            db.all('SELECT * FROM users', [], (err,users)=>{
                if(err){console.log(err.message);}
                db.all('SELECT * FROM drones', [], (err,drones)=>{
                    if(err){console.log(err.message);}
                    // oooooooooooooooooo
                    // console.log(pack, adds, drones, users);
                    start(drones,pack,adds,users);
                    
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

function select(arr, key){
    const len=arr.length;
    for (let i=0;i<len;i++){
        let par=key;
        if(arr[i][par]){
            return arr[i];
        }
    }
};

function dataMes(drone,parcel,adds,users){
    const arr=[];
    arr.push(drone.name);
    arr.push(parcel.content);
    arr.push(users.find(user=>user.id==parcel.userId).name);
    arr.push(adds.find(ad=>ad.id==parcel.addressId).adds);
    arr.push(adds.find(ad=>ad.id==parcel.addressId).id);
    return arr;
}

function start(drones,pack,adds,users){
    let drone=select(drones,'isFree');
    let parcel=select(pack,'delivered');
    let mes=dataMes(drone,parcel,adds,users);
    let delay=mes[4]*1000;;
    drone.isFree=false;
    pack.splice(pack.find((item,i)=>{item==parcel;return i;}),1);
    console.log(`${mes[0]} start delivering ${mes[1]} to ${mes[2]} for ${mes[3]}`);
    setTimeout(function(){
        console.log(`${mes[0]} delivered ${mes[1]} to ${mes[2]} for ${mes[3]}`);
        setTimeout(function(){
            drone.isFree=true;
        },delay)
    },delay);
};