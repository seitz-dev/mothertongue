export class MothertongueLogger {

    constructor(public doDebugMessages: boolean = false) { }

    err(message: string) {
        console.error(message);
    }

    log(message: string) {
        console.log(message);
    }

    debug(message: string) {
        if (this.doDebugMessages) {
            console.debug(message);
        }
    }

    logClear(message: string) {
        if (!this.doDebugMessages) {
            console.clear();
        }
        console.log(message);
    }

}