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
            <div class="machine text-left" v-if="display_machine(ind)">
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
              <table class="table mt-3 table-hover text-center">
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
                    <td class="text-left">
                      <div class="btn btn-success" v-on:click="editName(order)" v-if="!(order.loading || order.upload_status == 'inprogress')">✏️</div>
                      <div class="btn btn-secondary" v-if="order.loading || order.upload_status == 'inprogress'">🕘</div>
                      &nbsp;
                      <div class="btn btn-primary" v-bind:class="{ 'btn-primary': order.upload_status == null, 'btn-danger': order.upload_status == 'failed', 'btn-success': order.upload_status == 'complete' }" v-on:click="list_remote_folders(order)" v-b-modal="'select-folder-modal'" v-if="!order.loading && order.name.length > 0 && order.upload_status != 'inprogress'">⬆️</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div>
      <b-modal id="select-folder-modal" @ok="upload(selected_order, selected_folder)">
        <template #modal-header>
          Select Folder
        </template>
        Selected: {{ selected_folder }}
        <br/><br/>
        <div class="form-group">
          <input v-model="filter_search" type="text" class="form-control" placeholder="Filter"/>
        </div>
        <b-form-group v-slot="{ ariaDescribedby }">
          <b-form-radio v-model="selected_folder" :aria-describedby="ariaDescribedby" name="some-radios" value="/">/</b-form-radio>
          <b-form-radio v-model="selected_folder" :aria-describedby="ariaDescribedby" name="some-radios" v-bind:value="folder.displayName" v-for="(folder, ind) in filteredItems" :key="ind">{{ folder.displayName }}</b-form-radio>
        </b-form-group>
      </b-modal>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";
import { BModal, VBModal, BFormRadio, BFormGroup } from "bootstrap-vue";
var strftime = require('strftime')
var Console = console;
export default {
  components: {
    BModal,
    BFormRadio,
    BFormGroup
  },
  directives: { 
    'b-modal': VBModal,
    'b-form-group': BFormGroup,
    'b-form-radio': BFormRadio
  },
  data() {
    return {
      socket: io("192.168.88.245:4001"),
      machines: {},
      selected_order: null,
      remote_folders: [],
      selected_folder: null,
      filter_search: ""
    };
  },
  methods: {
    display_machine(ind) {
      if (location.hash == "") { return true }
      if (ind == location.hash.split("#")[1]) { return true }
      return false
    },
    list_remote_folders(order) {
      this.filter_search = ""
      this.selected_folder = "/"
      this.selected_order = order;
      this.socket.emit("list_remote_folders", {});
    },
    upload(order, folder) {
      this.socket.emit("upload", { hires_path: order.hires_path, name: order.name, path: folder });
    },
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
    this.socket.on("remote_folders", data => {
      Console.log(data);
      this.remote_folders = data;
    })
  },
  computed: {
    filteredItems() {
      return this.remote_folders.filter(item => {
        return item.displayName.toLowerCase().indexOf(this.filter_search.toLowerCase()) > -1
      })
    }
  }
};
</script>

<style>
  .table > tbody > tr > td {
    vertical-align: middle;
    padding: 5px;
  }
</style>