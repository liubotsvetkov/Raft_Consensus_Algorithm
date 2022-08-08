const grpc = require("@grpc/grpc-js");
const rest_server = require("./key-value-map/rest-server");
const rpc_server = require("./rpc/rpc-server");
const Constants = require("./utils/constants");
const election_service = require("./consensus-module/services/election-service");
const state = require("./consensus-module/data/state");

rest_server.listen(Constants.REST_SERVER_PORT, () => {
    console.log(`REST Service listening on port ${Constants.REST_SERVER_PORT}`);
});

rpc_server.bindAsync(
    `0.0.0.0:${Constants.RPC_SERVER_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log(`RPC Service running at port ${Constants.RPC_SERVER_PORT}`);
        rpc_server.start();
        //wait 1 second for server to boot
        setTimeout(() => {
            if (state.getStatus() === Constants.status.None) {
                election_service.setOffElectionTimer()
            }
        }, 1000);
    }
);