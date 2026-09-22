export namespace config {
	
	export class AppConfig {
	    onboardingCompleted: boolean;
	    selectedModel?: string;
	    language: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.onboardingCompleted = source["onboardingCompleted"];
	        this.selectedModel = source["selectedModel"];
	        this.language = source["language"];
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

