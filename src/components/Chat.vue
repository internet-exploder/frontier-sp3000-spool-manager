<template>
  <div class="container">
    <div class="card mt-3">
      <div class="card-body">
        <div class="card-title">
          <h3>Spool Status</h3>
          <hr />
        </div>
        <div class="card-body">
          <div class="machines" v-for="(machine, ind) in machines" :key="ind">
            <div class="machine">
              <div class="btn btn-primary">{{ ind }}</div>
              &nbsp;
              <div class="btn" v-bind:class="{ 'btn-success': machines[ind].status == 'online', 'btn-secondary': machines[ind].status == 'offline' }">{{ machines[ind].status }}</div>
              &nbsp;
              <div class="btn" v-bind:class="{ 'btn-success': machines[ind].outspool_mounted, 'btn-secondary': !machines[ind].outspool_mounted }">OutSpool</div>
              &nbsp;
              <div class="btn" v-bind:class="{ 'btn-success': machines[ind].photos_mounted, 'btn-secondary': !machines[ind].photos_mounted }">Photos</div>
              &nbsp;
              <div class="btn btn" v-on:click="virsh_toggle(ind)" v-bind:class="{ 'btn-success': machines[ind].status == 'offline', 'btn-danger': machines[ind].status == 'online' }">
                {{ machines[ind].status == "online" ? "Stop" : "Start" }}
              </div>
              <table class="table mt-3 table-hover">
                <thead>
                  <tr>
                    <th>scan id</th>
                    <th>order id</th>
                    <th>outspool</th>
                    <th>complete</th>
                    <th>hires</th>
                    <th>Name</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody v-for="(order, ind) in machines[ind].outspool_last" :key="ind">
                  <tr>
                    <td>{{ order.order_id }}</td>
                    <td>{{ order.order_uuid }}</td>
                    <td>{{ order.outspool_folder }}</td>
                    <td>{{ order.complete }}</td>
                    <td>{{ order.hires_path }}</td>
                    <td>{{ order.name }}</td>
                    <td>
                      <div class="btn btn-success" v-on:click="editName(order)">✏️</div>
                      <div class="btn btn-secondary" v-if="order.loading == true">🕘</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";
var strftime = require('strftime')
var Console = console;
export default {
  data() {
    return {
      socket: io("192.168.88.245:4001"),
      machines: {}
    };
  },
  methods: {
    editName(order) {
      var input;
      input = prompt("Enter new name for "+order.order_uuid+":", strftime("%d.%m.%y"));
      if (input === null) {
        return; //break out of the function early
      }
      var new_name = input;
      order.loading = true;
      Console.log(order);
      this.socket.emit("symlink", { hires_path: order.hires_path, name: new_name });
    },
    virsh_toggle(key) {
      Console.log(key)
      if (this.machines[key]["status"] == "online") {
        this.socket.emit("virsh", { cmd: "shutdown", name: key });
      } else {
        this.socket.emit("virsh", { cmd: "start", name: key });
      }
    }
  },
  mounted() {
    this.socket.on("machines", data => {
      this.machines = data;
      window.machines = data;
    })
  }
};
</script>

<style>
  .table > tbody > tr > td {
    vertical-align: middle;
    padding: 5px;
  }
</style>