const express = require('express');
const app = express();
const socket = require('socket.io');
const server = app.listen(process.env.PORT || 4001, () => console.log(`Running on http://localhost:4001`));
const axios = require("axios");
const { exec } = require("child_process");
const { parse } = require('path');

//socket setup
const io = socket(server);

// const index = require("./routes/index");


app.get("/", (req, res) => {
  res.send({ response: "I am alive" }).status(200);
});

machines = {
  "xp3": {
    status: "offline",
    ip: "192.168.3.5"
  },
  "xp2": {
    status: "offline",
    ip: "192.168.4.5"
  }
}

io.on('connection', socket => {
  io.emit("machines", machines)
  socket.on('SEND_MESSAGE', data => {
    console.log(data);
    io.emit('MESSAGE', data)
  });
  // socket.emit('sent', `Ye bhja ha`)
})

setInterval(function() {
  console.log("processing update");
  Object.keys(machines).forEach(function(key) {
    console.log(key);
    get_status(key);
  })
}, 1000)

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
      if ((parseInt(stdout) == 0) && (machines[key]["status"] == "online")) {
        exec('mount -t cifs -o vers=1.0,credentials=/root/.cifs //'+machines[key]['ip']+'/OutSpool /mnt/'+key+'_outspool', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Mounted ${key} OutSpool`);
        });
      }
      // Unmount if offline and mounted
      if ((parseInt(stdout) > 0) && (machines[key]["status"] == "offline")) {
        exec('umount -l /mnt/'+key+'_outspool', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Unmounted ${key} OutSpool`);
        });
      }
    });

    // Check wether Photos share has been mounted
    exec('mount | grep "'+key+'.*photos" | wc -l', (error, stdout, stderr) => {
      if (error) { console.log(`error: ${error.message}`); return; }
      if (stderr) { console.log(`stderr: ${stderr}`); return; }
      // Mount if online and not mounted
      if ((parseInt(stdout) == 0) && (machines[key]["status"] == "online")) {
        exec('mount -t cifs -o vers=1.0,credentials=/root/.cifs //'+machines[key]['ip']+'/Photos /mnt/'+key+'_photos', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Mounted ${key} Photos`);
        });
      }
      // Unmount if offline and mounted
      if ((parseInt(stdout) > 0) && (machines[key]["status"] == "offline")) {
        exec('umount -l /mnt/'+key+'_photos', (error, stdout, stderr) => {
          if (error) { console.log(`error: ${error.message}`); return; }
          if (stderr) { console.log(`stderr: ${stderr}`); return; }
          console.log(`Unmounted ${key} Photos`);
        });
      }
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