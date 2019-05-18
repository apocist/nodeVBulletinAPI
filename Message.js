'use strict';

/**
 *
 * @type {Class}
 * @property {number} userId
 */
class Message {
    /**
     *
     * @typedef {Object} RawMessageData
     * @property {Object} messageData
     * @property {string} messageData.userid
     */

    /**
     *
     * @param {RawMessageData} rawData
     */
    constructor(rawData) {
        this.rawData = rawData;
        this.__parseData();
        this.__cleanup();
    };

    __parseData() {
        let that = this;
        if (this.rawData) {
            let rawData = this.rawData;
            console.log(rawData);

        }
    };

    __cleanup() {
        delete (this.rawData);
    };
}

module.exports = Message;