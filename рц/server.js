const sqlite = require('sqlite3').verbose();
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.set('view engine', 'ejs');



app.get('/', function(req, res){
    res.render('index');
    // let db = new sqlite.Database('delivery.db');
    // db.run(`UPDATE parcels SET delivered = "false"`);
    
});

app.post('/', urlencodedParser, function(req, res){
    if (!req.body.userName||!req.body.parcelContent||!req.body.addressesAdds){}
    else{
        postSql(req.body);
        res.render('index');
    };
});



io.on('connection', function(socket){
    socket.on('message', function(msg){
        let db = new sqlite.Database('delivery.db');
        deliveryP(db);
    });
});


http.listen(3000);


function sqlIns(table,keys,vals){
    if( typeof keys==="string"){
        return 'INSERT into '+table+'('+keys+')values("'+vals+'")';
    }else{
        let k=keys.join(',');
        let v=vals.join('","');
        return 'INSERT into '+table+'('+k+')values("'+v+'")';
    }
};

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
};

function deliveryP(db){
    db.all('SELECT * FROM parcels WHERE delivered="false"', [], function e(err,pack){
        if(err){console.log(err.message);};
        db.all('SELECT * FROM addresses', [], (err,adds)=>{
            if(err){console.log(err.message);}
            db.all('SELECT * FROM users', [], (err,users)=>{
                if(err){console.log(err.message);}
                db.all('SELECT * FROM drones', [], (err,drones)=>{
                    if(err){console.log(err.message);}
                    emulate (drones,pack,adds,users,db);
                });
            });
        });
    });
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

function dataMes(drone,parcel,adds,users,drones){
    const arr=[];
    arr.push(drone.name);
    arr.push(parcel.content);
    arr.push(users.find(user=>user.id==parcel.userId).name);
    arr.push(adds.find(ad=>ad.id==parcel.addressId).adds);
    arr.push(adds.find(ad=>ad.id==parcel.addressId).id);
    return arr;
};

function start(drones,pack,adds,users,db){

    let drone=select(drones,'isFree');
    let parcel=select(pack,'delivered');

    let mes=dataMes(drone,parcel,adds,users,drones);

    let speed=drone.id;
    let delay=mes[4]/speed*1000;

    drone.isFree=false;
    pack.splice(pack.find((item,i)=>{item==parcel;return i;}),1);

    let condition=[drone.id,`"${mes[0]}" start delivering ${mes[1]} to ${mes[3]} for ${mes[2]}`];
    io.emit('message', condition);
    
    new Promise(function(resolve,reject){
        setTimeout(()=>{resolve()},delay)
    }).then(()=>{  
        updateBd(parcel,db);
        condition.pop();
        condition.push(`"${mes[0]}" delivered ${mes[1]}`);
        io.emit('message', condition);
        })
        .then(()=>{
            setTimeout(()=>{
                condition.pop();
                condition.push(`"${mes[0]}" on base`);
                io.emit('message', condition);
                drone.isFree=true;
                emulate (drones,pack,adds,users,db);
            },delay+500);
           }) 
};

function emulate (drones,pack,adds,users,db){
    let len=pack.length;
    for (i=0;i<len; i++){
        if(select(drones, "isFree")){
            start(drones,pack,adds,users,db);
        }
    }
};

function updateBd(parcel,db){

    db.run(`UPDATE parcels SET delivered = "true" WHERE id = ${parcel.id};`)
};


