module.exports = {
    SELF_ID: process.env.SELF_ID,
    PEER_IDS: process.env.PEER_IDS.split(','),
    RPC_SERVER_PORT: 50051,
    REST_SERVER_PORT: 3000,
    LOG_FILE_NAME: 'log.json',
    STATE_FILE_NAME: 'state.json',
    status: {
        Candidate: 'Candidate',
        Leader: 'Leader',
        Follower: 'Follower'
    }
}