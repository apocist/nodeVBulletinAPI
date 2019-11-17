import {VBApi} from "./VBApi";

export class FetchableObject {
    protected readonly vbApi: VBApi;
    protected rawData: any;

    fetched: boolean = false;
    fetchTime: Date;

    constructor(vbApi: VBApi, rawData?: any) {
        this.vbApi = vbApi;
        if (rawData) {
            this.rawData = rawData;
            this.parseData();
            this.cleanup();
        }
    }

    protected parseData() {
        if (this.rawData) {
            this.fetched = true;
            this.fetchTime = new Date();
        }
    }

    protected cleanup() {
        delete this.rawData;
    }
}