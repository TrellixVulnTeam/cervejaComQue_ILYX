'use strict';
const fs = require('fs');


var dialogs = JSON.parse(fs.readFileSync('./dialogs.json', 'utf8'));

//import action constants
const actions = require('./actions');
const contexts = require('./contexts');
const constDialogs = require('./dialogs');
const suggestChips = require('./suggestionsChips');
const configFile = require('./config');
const entities = require('./entities');
const firebase = require('firebase');

// parameters
const CERVEJA_ESTILO = 'cerveja_estilo';
const COMIDA = "comida";
const BITTERNESS = 'bitterness';
const COLOR = 'color';
const ALCOHOLIC_VOL = 'alcoholicVolume';

const ACK = dialogs[constDialogs.ACK];
//phrases end
const FIM_FRASE = dialogs[constDialogs.FIM_FRASE];

const FALLBACK = dialogs[constDialogs.FALLBACK];
const FALLBACK_FINISH = dialogs[constDialogs.FALLBACK_FINISH];
const ABOUT = dialogs[constDialogs.ABOUT];
const SUGERIR_LOJA = dialogs[constDialogs.SUGERIR_LOJA];
const SUGGESTION_ACCEPTED = dialogs[constDialogs.SUGGESTION_ACCEPTED];
const ASK_BITTER = dialogs[constDialogs.ASK_BITTER];
const ASK_ALCOHOLIC = dialogs[constDialogs.ASK_ALCOHOLIC];
const ASK_COLOR = dialogs[constDialogs.ASK_COLOR];
const HC_1st_SUGGEST = dialogs[constDialogs.HC_FIRST_STYLE_SUGGEST];
const HC_FOLLOW_SUGGEST = dialogs[constDialogs.HC_FOLLOWING_STYLE_SUGGEST];
const WELCOME = dialogs[constDialogs.WELCOME];
const WELCOME_BACK=dialogs[constDialogs.WELCOME_BACK];
const WELCOME_BACK_NOPERM=dialogs[constDialogs.WELCOME_BACK_NOPERM];
const PERMISSION = dialogs[constDialogs.PERMISSION];
const NON_PERM_ENDING = dialogs[constDialogs.NON_PERM_ENDING];
const PERM_ENDING = dialogs[constDialogs.PERM_ENDING];
const PROCUROU_MARCA = dialogs[constDialogs.PROCUROU_MARCA];

//File with data
const HARM_JSON_FILE = 'harmonizacoes.json';

//phrases to suggest
const FIRST_FOOD_SUGGESTIONS =dialogs[constDialogs.FIRST_FOOD_SUGGESTIONS];
const FIRST_STYLE_SUGGESTONS = dialogs[constDialogs.FIRST_STYLE_SUGGESTONS];

const SECOND_SUGGESTIONS = dialogs[constDialogs.SECOND_SUGGESTIONS];
const NO_SUGGESTION = dialogs[constDialogs.NO_SUGGESTIONS];

const MAX_FALLBACKS = 3;

//constants used to help the user select a beer
const IBU_INCREMENT = 15;
const TeorA_INCREMENT = 1.8;
const SRM_INCREMENT = 8;

var _app;
var _firebaseApp;

// Set the configuration for the database
const config = {
	apiKey: configFile.API_KEY,
	authDomain: configFile.AUTH_DOMAIN,
	databaseURL: configFile.DATABASE_URL,
	storageBucket: configFile.STORAGE_BUCKET
};


function readJsonFile(filename){
		return JSON.parse(fs.readFileSync(filename, 'utf8'));
	}

function getRandomEntry(arr){
		return arr[Math.floor(Math.random() * arr.length)];
	}

function getEstilo(estilo){
		var harmoniza = readJsonFile(HARM_JSON_FILE);
		for(var i=0, maxEstilos = harmoniza.estilos.length; i< maxEstilos; i++){
			if (harmoniza.estilos[i].nome === estilo) {
				return harmoniza.estilos[i];
			}
		}
		return undefined;
	}

function getEstilosByFood(food){
		let estilos = [];
		var harmoniza = readJsonFile(HARM_JSON_FILE);
		for(var i=0, maxEstilos = harmoniza.estilos.length; i< maxEstilos; i++){
			for(var j=0, maxComidas = harmoniza.estilos[i].comidas.length;  j<maxComidas; j++){
				let comida = harmoniza.estilos[i].comidas[j];
				if (comida.toLowerCase() === food.toLowerCase()) {
					estilos.push(harmoniza.estilos[i].nome);
				}
			}
			
		}
		return estilos;
	}

//This is only for common settings the whole response, like prosody, you still need to add breaks, sentences, etc before calling this method
function buildSpeech(message){
	let speech = '<speak>';
	speech += '<prosody rate="medium" pitch="+1st" volume="medium">';
	speech += message;
	speech += '</prosody>';
	speech += '</speak>';
	return speech
}

class CervejaComQue{


	constructor(app){
		_app = app;
		let actionMap = new Map();

		actionMap.set(actions.WELCOME_ACTION, this.welcome.bind(this));
		
		actionMap.set(actions.FINISH_APP_ACTION,this.finishApp.bind(this));
		

	  	actionMap.set(actions.COMIDA_ACTION, this.procurarComida.bind(this));
	  	actionMap.set(actions.MUDAR_ESTILO_ACTION, this.mudarEstilo.bind(this));
	  	actionMap.set(actions.CERVEJA_ACTION, this.procurarCerveja.bind(this));
	  	actionMap.set(actions.FALLBACK_ACTION, this.fallBack.bind(this));
	  	actionMap.set(actions.ABOUT_ACTION, this.about.bind(this));
	  	
	  	actionMap.set(actions.SUGGESTION_ACCEPTED_ACTION, this.suggestionAccepted.bind(this));

	  	actionMap.set(actions.HC_ACTION, this.helpChoose.bind(this));
	  	actionMap.set(actions.HC_STP2_MAIS_ACTION,this.helpChooseStp2Mais.bind(this));
	  	actionMap.set(actions.HC_STP2_MENOS_ACTION,this.helpChooseStp2Menos.bind(this));
	  	
	  	actionMap.set(actions.HC_STP2_TANTOFAZ_ACTION,this.helpChooseStp2TantoFaz.bind(this));
	  	actionMap.set(actions.HC_STP3_MAIS_ACTION,this.helpChooseStp3Mais.bind(this));
	  	actionMap.set(actions.HC_STP3_MENOS_ACTION,this.helpChooseStp3Menos.bind(this));
	  	
	  	actionMap.set(actions.HC_STP3_TANTOFAZ_ACTION,this.helpChooseStp3TantoFaz.bind(this));
	  	actionMap.set(actions.HC_STP4_MAIS_ACTION,this.helpChooseStp4Mais.bind(this));
	  	actionMap.set(actions.HC_STP4_MENOS_ACTION,this.helpChooseStp4Menos.bind(this));
	  	
	  	actionMap.set(actions.HC_STP4_TANTOFAZ_ACTION,this.helpChooseStp4TantoFaz.bind(this));
	  	actionMap.set(actions.HC_ACCEPTED_ACTION, this.helpChooseAccepted.bind(this));
	  	actionMap.set(actions.HC_REJECTED_ACTION, this.helpChooseRejected.bind(this));

	  	actionMap.set(actions.HANDLE_PERMISSION, this.handlePermission.bind(this));
	  	actionMap.set(actions.PROCUROU_MARCA, this.procurarMarca.bind(this));

	  	_app.handleRequest(actionMap);
	}

	procurarMarca(){
		_app.ask(_app.buildRichResponse()
		 			.addSimpleResponse({speech:buildSpeech(getRandomEntry(PROCUROU_MARCA))})
		 			.addSuggestions(['Lager', 'Pilsen','IPA'])
		 			);	
	}

 	//Searches for a food according to the beer style input
 	procurarComida(){

 		this.resetFallbackCount();

 		let estilo = _app.getArgument(CERVEJA_ESTILO);

 		//If there is no beer stlye argument it means it is not the first suggestion, use the style saved before
 		if(!estilo){
			estilo = _app.data.estilo; 			
 		}

 		//get all foods of desired style
 		const estiloComida = getEstilo(estilo); 
 		let foods;
		if(estiloComida){
 			foods = getEstilo(estilo).comidas;
		}

 		_app.data.estilo = estilo;

 		this.suggest(actions.COMIDA_ACTION, foods,estilo);

 	}

 	mudarEstilo(){

 		this.resetFallbackCount();

 		_app.data.sugeridos = undefined;
 		this.procurarComida();
 	}

 	procurarCerveja(){

 		this.resetFallbackCount();

 		let food = _app.getArgument(COMIDA);

 		//If there is no beer stlye argument it means it is not the first suggestion, use the style saved before
 		if(!food){
			food = _app.data.food; 			
 		}

 		_app.data.food = food;

 		let estilos = getEstilosByFood(food);

 		this.suggest(actions.CERVEJA_ACTION, estilos,food);

 	}

 	fallBack(){
 		let consecutiveFallbacks;
		if(!_app.data.consecutiveFallbacks){
			consecutiveFallbacks = 1;
		}
		else{
			consecutiveFallbacks = _app.data.consecutiveFallbacks;
		}

 		if(consecutiveFallbacks < MAX_FALLBACKS){

 			_app.data.consecutiveFallbacks = ++consecutiveFallbacks;
 			//Fallback
 			_app.ask(buildSpeech(getRandomEntry(FALLBACK)));

 		}
 		else{
 			_app.data.consecutiveFallbacks = 0;

			let finishSpeech = buildSpeech(getRandomEntry(FALLBACK_FINISH));

			let richResponse = this.buildCardWithButton('Sites com harmonização de cervejas','Harmonização de Cervejas',
				'https://www.revide.com.br/media/cache/aa/68/aa687d9843b4339605d1a372d2c86b4d.jpg',
				'imagem de 4 pequenos copos de cerveja de estilos diferentes, com um mini prato com diferentes comidas em frente a cada um.',
				'Brejas','http://www.brejas.com.br/harmonizacao-cerveja.shtml',finishSpeech);

 			_app.tell(richResponse);


 		}
 	}

 	about(){
 		this.resetFallbackCount();
 		this.ask(buildSpeech(getRandomEntry(ABOUT)));

 	}


 	suggestionAccepted(app){
 		//verificar se o nome ja foi salvo
 		if(!app.data.userName){
 			//se nao foi, pedir permissao para salvar
 			this.requestPermission(app);
 		}
 		else{
 			this.finishApp();
 		}
 	}

 	requestPermission (app) {
	 	app.askForPermission(getRandomEntry(PERMISSION), app.SupportedPermissions.NAME);
	}

	handlePermission(app){
		if(app.isPermissionGranted()){
			app.data.userName = app.getUserName().givenName;
			this.saveName(app);
			this.finishApp();
		}
		else{
			//No permission was granted, so just finish
			app.tell(buildSpeech(getRandomEntry(ACK) + getRandomEntry(NON_PERM_ENDING)));
		}
	}

	saveName(app){

		if(!_firebaseApp){

 			_firebaseApp = firebase.initializeApp(config);
 		}

		firebase.auth().signInWithEmailAndPassword(configFile.FIREBASE_DB_USER,configFile.FIREBASE_DB_PASS).catch(function(error) {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;

			console.log('##### Error authenticating:' + errorCode + ' - ' + errorMessage);
		});

		_firebaseApp.database().ref('users/' + app.getUser().userId).set({
			name: app.getUserName().givenName
			});

	}

 	helpChoose(){
 		this.resetFallbackCount();

 		//initial values for each style property
		let ibu = 50;
		let teorA = 6;
		let srm  = 10;

		//save settings for filtering later
 		_app.data.ibu = ibu;
 		_app.data.teorA  = teorA;
 		_app.data.srm = srm;

 		let _alcoholicVol = _app.getArgument(ALCOHOLIC_VOL);
 		let _color = _app.getArgument(COLOR);
 		let _bitterness = _app.getArgument(BITTERNESS);

 		if(!_bitterness && !_color && !_alcoholicVol){

 			let sugChips = [suggestChips.MAIS,suggestChips.MENOS,suggestChips.TANTO_FAZ];

	 		_app.ask(_app.buildRichResponse()
		 			.addSimpleResponse(buildSpeech(getRandomEntry(ACK) +  getRandomEntry(ASK_BITTER)))
		 			.addSuggestions(sugChips)
		 			);
	 	}
	 	else{// this is the case where the user said the whole phrase

	 		//Extract the user's input settings
	 		this.setIBU(_bitterness);
	 		this.setSRM(_color);
	 		this.setAlcVol(_alcoholicVol);
	 		
	 		this.helpChoose1stSuggestion();
	 	}
 	}

 	helpChooseStp2Mais(){
		this.resetFallbackCount();

		let ibu = _app.data.ibu;

		//increment IBU setting
		ibu += IBU_INCREMENT;

		//max limit for ibu
		if(ibu > 120){
			ibu = 120;
		}

		_app.data.ibu = ibu;

		let sugChips = [suggestChips.MAIS,suggestChips.MENOS,suggestChips.TANTO_FAZ];

		this.helpChooseFinishStep(contexts.CTX_BITTERNESS,undefined,ASK_ALCOHOLIC, sugChips);
		
 	}

 	helpChooseStp2Menos(){
 		this.resetFallbackCount();

		let ibu = _app.data.ibu;

		//decrement IBU setting
		ibu -= IBU_INCREMENT;

		//min limit for ibu
		if(ibu < 0){
			ibu = 0;
		}

		_app.data.ibu = ibu;

		let sugChips = [suggestChips.MAIS,suggestChips.MENOS,suggestChips.TANTO_FAZ];

		this.helpChooseFinishStep(contexts.CTX_BITTERNESS,undefined,ASK_ALCOHOLIC, sugChips);

 	}


 	helpChooseStp2TantoFaz(){

 		this.resetFallbackCount();

 		let sugChips = [suggestChips.MAIS,suggestChips.MENOS,suggestChips.TANTO_FAZ];

		this.helpChooseFinishStep(contexts.CTX_BITTERNESS,undefined,ASK_ALCOHOLIC, sugChips);

 	}

 	helpChooseStp3Mais(){
		this.resetFallbackCount();

		let teora = _app.data.teorA;

		//increment alcoholic volume
		teora += TeorA_INCREMENT;

		//max limit for alcoholic volume
		if(teora > 100){
			teora = 100;
		}

		_app.data.teorA = teora;

		let sugChips = [suggestChips.CLARA,suggestChips.ESCURA,suggestChips.TANTO_FAZ];

		this.helpChooseFinishStep(contexts.CTX_ALCOHOLIC_LVL,contexts.CTX_BITTERNESS,ASK_COLOR, sugChips);
		
 	}

 	helpChooseStp3Menos(){
 		this.resetFallbackCount();

		let teora = _app.data.teorA;

		//decrement alcoholic volume
		teora -= TeorA_INCREMENT;

		//min limit for alcoholic volume
		if(teora < 0){
			teora = 0;
		}

		_app.data.teorA = teora;

		let sugChips = [suggestChips.CLARA,suggestChips.ESCURA,suggestChips.TANTO_FAZ];

		this.helpChooseFinishStep(contexts.CTX_ALCOHOLIC_LVL,contexts.CTX_BITTERNESS,ASK_COLOR, sugChips);
 	}

 	helpChooseStp3TantoFaz(){

 		this.resetFallbackCount();

		//no filter needed

		let sugChips = [suggestChips.CLARA,suggestChips.ESCURA,suggestChips.TANTO_FAZ];

		this.helpChooseFinishStep(contexts.CTX_ALCOHOLIC_LVL,contexts.CTX_BITTERNESS,ASK_COLOR, sugChips);

 	}

 	helpChooseStp4Mais(){
		this.resetFallbackCount();

		let color = _app.data.srm;

		//increment color
		color += SRM_INCREMENT;

		//max limit for SRM
		if(color > 40){
			color = 40;
		}

		_app.data.srm = color;

		this.helpChooseFinishStep(contexts.CTX_COLOR,contexts.CTX_ALCOHOLIC_LVL,undefined,undefined);

		this.helpChoose1stSuggestion();
 	}


 	helpChooseStp4Menos(){
 		this.resetFallbackCount();

		let color = _app.data.srm;

		//increment color
		color -= SRM_INCREMENT;

		//min limit for SRM
		if(color < 0){
			color = 0;
		}

		_app.data.srm = color;

		this.helpChooseFinishStep(contexts.CTX_COLOR,contexts.CTX_ALCOHOLIC_LVL,undefined, undefined);

		this.helpChoose1stSuggestion();
 	}

 	helpChooseStp4TantoFaz(){

 		this.resetFallbackCount();

		//no filter needed

		this.helpChooseFinishStep(contexts.CTX_COLOR,contexts.CTX_ALCOHOLIC_LVL,undefined, undefined);

		this.helpChoose1stSuggestion();

 	}

 	helpChooseAccepted(){
 		_app.setContext(contexts.CTX_COMIDA);

 		let estilo = _app.data.estilo;

 		this.suggest(actions.COMIDA_ACTION, getEstilo(estilo).comidas,estilo);
 	}

 	helpChooseRejected(){

 		let estilo = _app.data.estilo;
 		let filteredList = _app.data.list;
 		let newList = [];

 		//remove from the list the rejected style 
 		for(let i = 0; i< filteredList.length ; i++){
 			if(filteredList[i].nome != estilo){
 				newList.push(filteredList[i]);
 			}
 		}

 		let estiloObj = getRandomEntry(newList);

 		if(estiloObj){

	 		_app.data.estilo = estiloObj.nome;
	 		_app.data.list = newList;

	 		this.ask(buildSpeech(getRandomEntry(ACK) +  getRandomEntry(HC_FOLLOW_SUGGEST).replace('$1',estiloObj.nome)));
	 	}
	 	else{
	 		let resposta = buildSpeech(getRandomEntry(NO_SUGGESTION));
	 		resposta = this.buildCardWithButton('Sites com harmonização de cervejas','Harmonização de Cervejas',
				'https://www.revide.com.br/media/cache/aa/68/aa687d9843b4339605d1a372d2c86b4d.jpg',
				'imagem de 4 pequenos copos de cerveja de estilos diferentes, com um mini prato com diferentes comidas em frente a cada um, em cima de uma tábua de madeira.',
				'Brejas','http://www.brejas.com.br/harmonizacao-cerveja.shtml',resposta);

			_app.tell(resposta);	

	 	}

 	}


 	welcome(app){
 		let welcomePhrase = "";

 		let sugChips = [suggestChips.HARMONIZAR_CERVEJA, suggestChips.HELP_CHOOSE];

 		if(app.getUser().lastSeen){

 			if(!_firebaseApp){

	 			_firebaseApp = firebase.initializeApp(config);
	 		}

			firebase.auth().signInWithEmailAndPassword(configFile.FIREBASE_DB_USER,configFile.FIREBASE_DB_PASS).catch(function(error) {
				// Handle Errors here.
				var errorCode = error.code;
				var errorMessage = error.message;

				console.log('##### Error authenticating:' + errorCode + ' - ' + errorMessage);
			});

			// Get a reference to the database service
			let database = _firebaseApp.database();

			let userId = app.getUser().userId;

			database.ref('/users/' + userId).once('value').then(function(snapshot){
				let userName = (snapshot.val() && snapshot.val().name);
				if (userName) {
		 			welcomePhrase = buildSpeech(getRandomEntry(WELCOME_BACK).replace("$1",userName));
		 			app.data.userName = userName;
		 		}
		 		else{
		 			welcomePhrase = buildSpeech(getRandomEntry(WELCOME_BACK_NOPERM));
		 		}
		 		app.ask(app.buildRichResponse()
		 			.addSimpleResponse({speech:welcomePhrase})
		 			.addSuggestions(sugChips)
		 			);
		 		
			}); 

 		}
 		else{
 			welcomePhrase = buildSpeech(getRandomEntry(WELCOME));
 			app.ask(app.buildRichResponse()
		 			.addSimpleResponse({speech:welcomePhrase})
		 			.addSuggestions(sugChips)
		 			);
 		}
 				
 	}

 	finishApp(){
		//check if the user has already granted permission to save his info
		if(_app.data.userName){
			_app.tell(buildSpeech(getRandomEntry(ACK) +  getRandomEntry(PERM_ENDING).replace('$1',_app.data.userName)));
		}
		else{
			//ask user for permission
			// requestPermission(app);
			_app.tell(buildSpeech(getRandomEntry(ACK) +  getRandomEntry(NON_PERM_ENDING)));
		}
	}

	ask(message){
		_app.ask(buildSpeech(message));
	}

  	
  	suggest(what, arrSuggest, userInput){

		let resposta = buildSpeech(getRandomEntry(NO_SUGGESTION));

		let refused;
		let refusedAny = false;

		let FIRST_SUGGESTIONS;

		//what the user wants
		if(what === actions.CERVEJA_ACTION){
			if(_app.data.estilos_sugeridos){
				refused = _app.data.estilos_sugeridos;
			}
			FIRST_SUGGESTIONS = FIRST_STYLE_SUGGESTONS;
		}
		else
		{
			if(_app.data.comidas_sugeridas){
				refused = _app.data.comidas_sugeridas;	
			}
			FIRST_SUGGESTIONS = FIRST_FOOD_SUGGESTIONS;
		}

		let suggestions = [];
		
		//if there is any food that was already suggest it means the user refused the first suggestion
		if(refused){

			refusedAny = true;

			//remove from the list those already refused foods
			for(var i =0; i < arrSuggest.length;i++){
				if(refused.indexOf(arrSuggest[i]) == -1){
					suggestions.push(arrSuggest[i]);
				}
			}
		}
		else{
			suggestions = arrSuggest;
		}

		if(suggestions.length > 0){
			let suggestion = getRandomEntry(suggestions);
			if(!refusedAny){//this is the first suggestion
				resposta =  buildSpeech(getRandomEntry(ACK) + getRandomEntry(FIRST_SUGGESTIONS).replace('$1',userInput).replace('$2',suggestion) + getRandomEntry(FIM_FRASE));	
			}
			else{//this is the following suggestions
				resposta =  buildSpeech(getRandomEntry(ACK) + getRandomEntry(SECOND_SUGGESTIONS).replace('$2',suggestion) + getRandomEntry(FIM_FRASE));
			}
			
			//keeps track of what food was already suggested
			if(what === actions.CERVEJA_ACTION){
				if(!_app.data.estilos_sugeridos){
					_app.data.estilos_sugeridos = suggestion;
				}
				else{
					_app.data.estilos_sugeridos += ',' + suggestion;
				}
			}
			else{
				if(!_app.data.comidas_sugeridas){
					_app.data.comidas_sugeridas = suggestion;
				}
				else{
					_app.data.comidas_sugeridas += ',' + suggestion;
				}
			}
			_app.setContext(contexts.CTX_SUGGESTED,5);

			let sugChips = [suggestChips.DELICIA,suggestChips.OUTRA_COISA];

			_app.ask(_app.buildRichResponse()
		 			.addSimpleResponse(resposta)
		 			.addSuggestions(sugChips)
		 			); // this is called when suggesting food, we wait for the user reply (yes or no)
		}

		resposta = this.buildCardWithButton('Sites com harmonização de cervejas','Harmonização de Cervejas',
					'https://www.revide.com.br/media/cache/aa/68/aa687d9843b4339605d1a372d2c86b4d.jpg',
					'imagem de 4 pequenos copos de cerveja de estilos diferentes, com um mini prato com diferentes comidas em frente a cada um, em cima de uma tábua de madeira.',
					'Brejas','http://www.brejas.com.br/harmonizacao-cerveja.shtml',resposta);

		_app.tell(resposta);	// this is called when finishing talking to the user
	}


	resetFallbackCount(){
		if(_app.data && _app.data.consecutiveFallbacks){
			_app.data.consecutiveFallbacks = 0;
		}	
	}

	buildCardWithButton(text,title,imgPath, imgDesc, btnText, btnLink, _speech){
		let card = _app.buildBasicCard(text)
							.setTitle(title)
							.setImage(imgPath,imgDesc)
							.addButton(btnText,btnLink);


		return _app.buildRichResponse()
					.addSimpleResponse({ speech:_speech})
					.addBasicCard(card);
	}

	/*
		Update the list, set and/or remove the context and ask next question
	*/
	helpChooseFinishStep(newContext,removeContext,nextQuestionArr, sugChips){

		//set the new context
		_app.setContext(newContext,2);

		//if there is a removeContext, remove it
		if(removeContext){
			_app.setContext(removeContext,0);
		}
		if(nextQuestionArr){
			//ask next question
	 		_app.ask(_app.buildRichResponse()
		 			.addSimpleResponse(buildSpeech(getRandomEntry(ACK) +  getRandomEntry(nextQuestionArr)))
		 			.addSuggestions(sugChips)
		 			);
		}
	}

	helpChoose1stSuggestion(){
	 		
			let filteredList = [];

			//get user input on each property
			let minIBU = _app.data.ibu - (IBU_INCREMENT/2);
			let maxIBU = _app.data.ibu + (IBU_INCREMENT/2);

			let minTeorA = _app.data.teorA - (TeorA_INCREMENT/2);
			let maxTeorA = _app.data.teorA + (TeorA_INCREMENT/2);

			let minColor = _app.data.srm - (SRM_INCREMENT/2);
			let maxColor = _app.data.srm + (SRM_INCREMENT/2);

			var harmoniza = readJsonFile(HARM_JSON_FILE);

			for(var i =0; i < harmoniza.estilos.length; i++){
				if((harmoniza.estilos[i].minIBU >= minIBU && harmoniza.estilos[i].minIBU <= maxIBU) || (harmoniza.estilos[i].maxIBU >= minIBU && harmoniza.estilos[i].maxIBU <= maxIBU) &&
					(harmoniza.estilos[i].minTeorA >= minTeorA && harmoniza.estilos[i].minTeorA <= maxTeorA) || (harmoniza.estilos[i].maxTeorA >= minTeorA && harmoniza.estilos[i].maxTeorA <= maxTeorA) &&
					(harmoniza.estilos[i].minSRM >= minColor && harmoniza.estilos[i].minSRM <= maxColor) || (harmoniza.estilos[i].maxSRM >= minColor && harmoniza.estilos[i].maxSRM <= maxColor)){
					filteredList.push(harmoniza.estilos[i]);
				}
			}

			//add the list to be searched in case the user rejects
			_app.data.list = filteredList;

			let estilo = getRandomEntry(filteredList);

			_app.setContext(contexts.CTX_HC_1st_SUG,3);

			_app.data.estilo = estilo.nome;

			this.ask(buildSpeech(getRandomEntry(ACK) +  getRandomEntry(HC_1st_SUGGEST).replace('$1',estilo.nome)));

	 	}

	setIBU(_bitterness){

		let ibu = _app.data.ibu;

		if(_bitterness === entities.BITT_MAIS){
			ibu += IBU_INCREMENT;
		}
		else if(_bitterness === entities.BITT_MUITO_MAIS){
			ibu += (IBU_INCREMENT * 2);
		}
		else if(_bitterness === entities.BITT_MENOS){
			ibu -= IBU_INCREMENT;
		}
		else if(_bitterness === entities.BITT_MUITO_MENOS){
			ibu -= (IBU_INCREMENT * 2);
		}

		_app.data.ibu = ibu;
	}

	setSRM(_color){

		let srm = _app.data.srm;

		if(_color === entities.COLOR_ESCURA){
			srm += SRM_INCREMENT;
		}
		else if(_color === entities.COLOR_MUITO_ESCURA){
			srm += (SRM_INCREMENT * 2);
		}
		else if(_color === entities.COLOR_CLARA){
			srm -= SRM_INCREMENT;
		}
		else if(_color === entities.COLOR_MUITO_CLARA){
			srm -= (SRM_INCREMENT * 2);
		}

		_app.data.srm = srm;
	}

	setAlcVol(_alcoholicVol){
		
		let teorA = _app.data.teorA;

		if(_alcoholicVol === entities.ALC_VOL_ALTO){
			teorA += TeorA_INCREMENT;
		}
		else if(_alcoholicVol === entities.ALC_VOL_MUITO_ALTO){
			teorA += (TeorA_INCREMENT * 2);
		}
		else if(_alcoholicVol === entities.ALC_VOL_BAIXO){
			teorA -= TeorA_INCREMENT;
		}
		else if(_alcoholicVol === entities.ALC_VOL_MUITO_BAIXO){
			teorA -= (TeorA_INCREMENT * 2);
		}

		_app.data.teorA  = teorA;
	}
}

module.exports = CervejaComQue;