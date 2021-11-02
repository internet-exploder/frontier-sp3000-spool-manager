const express = require('express');
const app = express();
const socket = require('socket.io');
const server = app.listen(process.env.PORT || 4001, () => console.log(`Running on http://localhost:4001`));
const axios = require("axios");
const { exec } = require("child_process");
const { parse } = require('path');
var YandexDisk = require('yandex-disk').YandexDisk;
const { symlink } = require('fs');
var disk = new YandexDisk(process.env.YADISK_OAUTH_TOKEN);

//socket setup
const io = socket(server);

// const index = require("./routes/index");


app.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

machines = {
  "xp3": {
    status: "offline",
    ip: "192.168.3.5",
    outspool_mounted: false,
    photos_mounted: false,
    outspool_last: []
  },
  "xp2": {
    status: "offline",
    ip: "192.168.4.5",
    outspool_mounted: false,
    photos_mounted: false,
    outspool_last: []
  }
}

var orders = {}
var symlinks = {}

Object.keys(machines).forEach(function(key) {
  orders[key] = [];
});

io.on('connection', socket => {
  io.emit("machines", machines)
  socket.on('SEND_MESSAGE', data => {
    console.log(data);
    io.emit('MESSAGE', data)
  });

  socket.on("virsh", what_do => {
    if ((["start", "shutdown"].indexOf(what_do["cmd"]) > -1) && (Object.keys(machines).indexOf(what_do["name"]) > -1)) {
      machines[what_do["name"]]["status"] = "busy";
      io.emit("machines", machines)
      exec('virsh '+what_do["cmd"]+' '+what_do["name"], (error, stdout, stderr) => {
        if (error) { console.log(`error: ${error.message}`); return; }
        if (stderr) { console.log(`stderr: ${stderr}`); return; }
        console.log(stdout);
      });
    }
  });

  socket.on("symlink", what_do => {
    exec('ln -s '+what_do["hires_path"]+' "/root/symlinks/'+what_do["name"]+'"', (error, stdout, stderr) => {
      if (error) { console.log(`error: ${error.message}`); return; }
      if (stderr) { console.log(`stderr: ${stderr}`); return; }
      console.log(stdout);
    });
  });
  // socket.emit('sent', `Ye bhja ha`)
})

// Update status of each machine
setInterval(function() {
  Object.keys(machines).forEach(function(key) {
    get_status(key);
  })
  io.emit("machines", machines)
}, 2000)

// Update symlinks folder
setInterval(function() {
  exec("QUOTING_STYLE=c ls -l /root/symlinks | grep \"\\\->\" | sed 's/^[^\\\"]*\\\"/\\\"/g'", (error, stdout, stderr) => {
    if (error) { console.log(`error: ${error.message}`); return; }
    if (stderr) { console.log(`stderr: ${stderr}`); return; }
    var symlinks_raw = stdout.split("\n").filter(n => n)
    for (var rawlink of symlinks_raw) {
      symlinks[rawlink.split(" -> ")[1].slice(1, -1)] = rawlink.split(" -> ")[0].slice(1, -1);
    }
  });
}, 2000)

var get_status = function(key) {
  // Check wether machine is running
  exec('virsh list --all | grep "'+key+'.*running" | wc -l', (error, stdout, stderr) => {
    if (error) { console.log(`error: ${error.message}`); return; }
    if (stderr) { console.log(`stderr: ${stderr}`); return; }
    if (parseInt(stdout) > 0) {
      machines[key]["status"] = "online"
    } else {
      machines[key]["status"] = "offline"
    }
    // Check wether OutSpool share has been mounted
    exec('mount | grep "'+key+'.*outspool" | wc -l', (error, stdout, stderr) => {
      if (error) { console.log(`error: ${error.message}`); return; }
      if (stderr) { console.log(`stderr: ${stderr}`); return; }
      // Mount if online and not mounted
      if (parseInt(stdout) > 0) {
        machines[key]["outspool_mounted"] = true
      } else {
        machines[key]["outspool_mounted"] = false
      }
      if ((parseInt(stdout) == 0) && (machines[key]["status"] == "online")) {
        exec('mount -t cifs -o vers=1.0,credentials=/root/.cifs //'+machines[key]['ip']+'/OutSpool /mnt/'+key+'_outspool', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Mounted ${key} OutSpool`);
          machines[key]["outspool_mounted"] = true
        });
      }
      // Unmount if offline and mounted
      if ((parseInt(stdout) > 0) && (machines[key]["status"] == "offline")) {
        exec('umount -l /mnt/'+key+'_outspool', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Unmounted ${key} OutSpool`);
          machines[key]["outspool_mounted"] = false
        });
      }
      // if Mounted collect orders
      if ((parseInt(stdout) > 0) && (machines[key]["photos_mounted"])) {
        exec('ls /mnt/'+key+'_outspool | egrep -v "Device|ORDERINF|OrderPacks" | tail', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          orders[key] = []
          var paths = stdout.split("\n").filter(n => n).reverse();
          //console.log(paths);
          for (var dirpath of paths) {
            resolve_order(key, dirpath, paths)
          }
          //machines[key]["outspool_last"] = stdout.split("\n");
        });
      }
    });

    // Check wether Photos share has been mounted
    exec('mount | grep "'+key+'.*photos" | wc -l', (error, stdout, stderr) => {
      if (error) { console.log(`error: ${error.message}`); return; }
      if (stderr) { console.log(`stderr: ${stderr}`); return; }
      // Mount if online and not mounted
      if (parseInt(stdout) > 0) {
        machines[key]["photos_mounted"] = true
      } else {
        machines[key]["photos_mounted"] = false
      }
      if ((parseInt(stdout) == 0) && (machines[key]["status"] == "online")) {
        exec('mount -t cifs -o vers=1.0,credentials=/root/.cifs //'+machines[key]['ip']+'/Photos /mnt/'+key+'_photos', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Mounted ${key} Photos`);
          machines[key]["photos_mounted"] = true
        });
      }
      // Unmount if offline and mounted
      if ((parseInt(stdout) > 0) && (machines[key]["status"] == "offline")) {
        exec('umount -l /mnt/'+key+'_photos', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Unmounted ${key} Photos`);
          machines[key]["photos_mounted"] = false
        });
      }
    });

    
  });
}

var resolve_order = function(key, dirpath, paths) {
  var kekpath = dirpath;
  exec('grep Sort /mnt/'+key+'_outspool/'+dirpath+'/CdOrder.INF | cut -f 2 -d " "', (error, stdout, stderr) => {
    var dirpath = dirpath;
    if (error) { console.log(`error: ${error.message}`); return; }
    if (stderr) { console.log(`stderr: ${stderr}`); return; }
    var order_id = parseInt(stdout.split("\n")[0]);
    var complete = (stdout.split("\n").filter(n => n).length > 1);
    exec("find /mnt/"+key+"_photos/Job_*/Roll*/hires | grep -i jpg | sed 's/\(.*\)-.*/\1/' | grep "+order_id+"; exit 0", (error, stdout, stderr) => {
      if (error) { console.log(`error: ${error.message}`); return; }
      if (stderr) { console.log(`stderr: ${stderr}`); return; }
      var hires_path = stdout.split("\n")[0].split("/");
      hires_path.pop();
      hires_path = hires_path.join("/");
      var order_path = hires_path.split("/");
      order_path.pop();
      order_path.pop();
      order_path = order_path.join("/");
      exec("find "+order_path+"/Orders | grep -i jpg; exit 0", (error, stdout, stderr) => {
        if (error) { console.log(`error: ${error.message}`); return; }
        if (stderr) { console.log(`stderr: ${stderr}`); return; }
        var order_uuid = stdout.split(".")[0].split("/").reverse()[0];
        var symlink_name = "";
        if (Object.keys(symlinks).indexOf(hires_path) > -1) { symlink_name = symlinks[hires_path] }
        orders[key].push({ order_id: order_id, outspool_folder: kekpath, complete: complete, hires_path: hires_path, order_uuid: order_uuid, name: symlink_name })
        if (orders[key].length == paths.length) {
          machines[key]["outspool_last"] = orders[key].sort((a, b) => (a.order_id < b.order_id) ? 1 : -1);
        }
      });
    });
  });
}
// // const getApiAndEmit = "TODO";

// const express = require('express');


// const app = express();



// const server = app.listen(4001, function () {
//   console.log('server running on port 3001');
// });


// const io = require('socket.io')(server);

// io.on('connection', function (socket) {
//   console.log(socket.id)
//   socket.on('SEND_MESSAGE', function (data) {
//     io.emit('MESSAGE', data)
//   });
// });