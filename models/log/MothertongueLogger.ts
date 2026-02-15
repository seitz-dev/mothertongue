export class MothertongueLogger {
    
    err(message: string) {
        console.error(message);
    }

    log(message: string) {
        console.log(message);
    }

    logClear(message: string) {
        console.clear();
        console.log(message);
    }
    
}