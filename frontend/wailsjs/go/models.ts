export namespace config {
	
	export class AppConfig {
	    onboardingCompleted: boolean;
	    modelInstalled: boolean;
	    language: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.onboardingCompleted = source["onboardingCompleted"];
	        this.modelInstalled = source["modelInstalled"];
	        this.language = source["language"];
	    }
	}

}

