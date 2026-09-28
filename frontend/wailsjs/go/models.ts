export namespace config {
	
	export class AppConfig {
	    onboardingCompleted: boolean;
	    selectedModel?: string;
	    language: string;
	    transcriptionDevice?: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.onboardingCompleted = source["onboardingCompleted"];
	        this.selectedModel = source["selectedModel"];
	        this.language = source["language"];
	        this.transcriptionDevice = source["transcriptionDevice"];
	    }
	}

}

export namespace main {
	
	export class VideoExportStart {
	    output: string;
	
	    static createFrom(source: any = {}) {
	        return new VideoExportStart(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.output = source["output"];
	    }
	}

}

export namespace models {
	
	export class Info {
	    id: string;
	    name: string;
	    displaySize: string;
	    description: string;
	    status: string;
	    resourceNote?: string;
	    sizeBytes: number;
	    recommended: boolean;
	    selected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.displaySize = source["displaySize"];
	        this.description = source["description"];
	        this.status = source["status"];
	        this.resourceNote = source["resourceNote"];
	        this.sizeBytes = source["sizeBytes"];
	        this.recommended = source["recommended"];
	        this.selected = source["selected"];
	    }
	}

}

export namespace transcription {
	
	export class WordTimestamp {
	    id: string;
	    text: string;
	    start: number;
	    end: number;
	    confidence?: number;
	
	    static createFrom(source: any = {}) {
	        return new WordTimestamp(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.text = source["text"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.confidence = source["confidence"];
	    }
	}
	export class CaptionGroup {
	    id: string;
	    start: number;
	    end: number;
	    words: WordTimestamp[];
	
	    static createFrom(source: any = {}) {
	        return new CaptionGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.start = source["start"];
	        this.end = source["end"];
	        this.words = this.convertValues(source["words"], WordTimestamp);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Result {
	    language: string;
	    detectedLanguage?: string;
	    model: string;
	    words: WordTimestamp[];
	    captionGroups: CaptionGroup[];
	
	    static createFrom(source: any = {}) {
	        return new Result(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.language = source["language"];
	        this.detectedLanguage = source["detectedLanguage"];
	        this.model = source["model"];
	        this.words = this.convertValues(source["words"], WordTimestamp);
	        this.captionGroups = this.convertValues(source["captionGroups"], CaptionGroup);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

