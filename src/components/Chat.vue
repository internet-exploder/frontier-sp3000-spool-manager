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
              <div class="badge badge-primary">{{ ind }}</div>
              &nbsp;
              <div class="badge" v-bind:class="{ 'badge-success': machines[ind].status == 'online', 'badge-secondary': machines[ind].status == 'offline' }">{{ machines[ind].status }}</div>
              &nbsp;
              <div class="badge" v-bind:class="{ 'badge-success': machines[ind].outspool_mounted, 'badge-secondary': !machines[ind].outspool_mounted }">OutSpool</div>
              &nbsp;
              <div class="badge" v-bind:class="{ 'badge-success': machines[ind].photos_mounted, 'badge-secondary': !machines[ind].photos_mounted }">Photos</div>
              &nbsp;
              <div class="badge btn" v-on:click="virsh_toggle(ind)" v-bind:class="{ 'badge-success': machines[ind].status == 'offline', 'badge-danger': machines[ind].status == 'online' }">
                {{ machines[ind].status == "online" ? "Stop" : "Start" }}
              </div>
              <div class="card" v-for="(order, ind) in machines[ind].outspool_last" :key="ind">
                <div class="well">{{ ind }} {{ order }}</div>
              </div>
            </div>
          </div>
          <div class="messages" v-for="(msg, index) in messages" :key="index">
            <p>
              <span class="font-weight-bold">{{ msg.user }}:</span>
              {{ msg.message }}
            </p>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <form @submit.prevent="sendMessage">
          <div class="form-group">
            <label for="user">User:</label>
            <input type="text" v-model="user" class="form-control" />
          </div>
          <div class="form-group pb-3">
            <label for="message">Message:</label>
            <input type="text" v-model="message" class="form-control" />
          </div>
          <button type="submit" class="btn btn-success">Send</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";
var Console = console;
export default {
  data() {
    return {
      user: "",
      message: "",
      messages: [],
      socket: io("192.168.88.245:4001"),
      machines: {}
    };
  },
  methods: {
    sendMessage(e) {
      e.preventDefault();
      this.socket.emit("SEND_MESSAGE", {
        user: this.user,
        message: this.message
      });
      this.message = "";
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
    this.socket.on("MESSAGE", data => {
      this.messages = [...this.messages, data];
      // you can also do this.messages.push(data)
    });
    this.socket.on("machines", data => {
      this.machines = data;
      window.machines = data;
    })
  }
};
</script>

<style>
</style>