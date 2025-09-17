import { Module } from "../compiler/parser/Module";
import { MainEmbedded } from "./MainEmbedded";

interface IDEFileAccess {
    getName(): string;
    getText(): string;
}

interface SingleIDEAccess {
    getFiles(): IDEFileAccess[];
    forceReload(): void;
    forceReloadAsync(): Promise<void>;
}

interface OnlineIDEAccess {
    getIDE(id: string): SingleIDEAccess | undefined;
}


export class IDEFileAccessImpl implements IDEFileAccess {
    constructor(private module: Module){

    }

    getName(): string {
        return this.module.file.name;
    }
    getText(): string {
        return this.module.getProgramTextFromMonacoModel();
    }

    
}

export class SingleIDEAccessImpl implements SingleIDEAccess {
    
    constructor(private ide: MainEmbedded){
        this.ide = ide;
    }

    getFiles(): IDEFileAccess[] {
        return this.ide.getCurrentWorkspace().moduleStore.getModules(false).map(file => new IDEFileAccessImpl(file));        
    }

    forceReload(): void {
        this.ide.forceReload();
    }

    forceReloadAsync(): Promise<void> {
        return this.ide.forceReloadAsync();
    }

    getDatabase() {
    const dbTool = this.ide.getDatabaseTool();

    return new Promise((resolve, reject) => {
        dbTool.export(
            (db) => {
                const buffer = db.buffer instanceof ArrayBuffer ? db.buffer : new ArrayBuffer(db.buffer.byteLength);
                if (!(db.buffer instanceof ArrayBuffer)) {
                    new Uint8Array(buffer).set(new Uint8Array(db.buffer));
                }
                const blob = new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' });
                resolve(blob);
            },
            (error) => {
                reject("Export failed: " + error);
            }
        );
    });
}

}

export class OnlineIDEAccessImpl implements OnlineIDEAccess {
    
    private static  ideMap: Map<string, SingleIDEAccessImpl> = new Map();

    public static registerIDE(ide: MainEmbedded){
        OnlineIDEAccessImpl.ideMap.set(ide.config.id!,  new SingleIDEAccessImpl(ide));
    }
    
    getIDE(id: string): SingleIDEAccess | undefined {
        return OnlineIDEAccessImpl.ideMap.get(id);
    }

}