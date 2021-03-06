'use strict';

var mongoose = require('mongoose'),
	requestController = require('./request'),
	environmentController = require('./environment.js'),
	Request = mongoose.model('Requests'),
	keygen = require('ssh-keygen'),
	fileHelper = require('../../helpers/file');

exports.index = (req, res) => {
	res.status(200).send('NOT IMPLEMENTED: sign home page');
}

function signPublicUserKey(publicKey, userCa, idName, principalName, comment, validity) {
	return new Promise((resolve, reject) => {
		if(!comment) var comment = idName + "@scureshell"
		var keygenParam = {
				comment: comment,
				read: true,
				sign: true,
				cakey: userCa,
				publickey: publicKey,
				identity: 'test user',
				//principal: 'testuser',
				//validity: '+52w',
				destroy: true
			}
		//set optional params
		if(principalName) keygenParam.principal = principalName;
		if(validity) keygenParam.validity = validity;
		if(!idName) reject(new Error('Identity is required'))
		
		keygen(keygenParam, function(err, out){
			if(err) {
				console.log(err);
				reject(new Error("Public key could not be signed by CA"));
			} else {
				resolve(out.key)
			}
		})
	})
}

exports.signSigningRequest = (req, res) => {
	//verify request body param
	if (req.body.validity) var validity = req.body.validity
	else var validity = null
	if (req.body.principal) var principal = req.body.principal
	else var principal = null
	if (req.body.comment) var comment = req.body.comment
	else var comment = null
	if (req.body.identity) var identity = req.body.identity
	else var identity = req.body.user_id
	

	//set empty vars to hold returns from promises
	var userCa = "";
	var hostCa = "";
	var result = [];
	var signedKey = "";
	//verify request exists and has valid status
	requestController.verifyRequest(req.body.request_id)
		//verify environment referenced in request still exists
		.then((request) => { return environmentController.readEnvironmentById(request.environment_id); })
		//save public key to file
		.then((environment) => { 
			userCa = environment.user_cert_priv_path;
			hostCa = environment.host_cert_priv_path;
			return fileHelper.savePublicKey(req.body.public_key, req.body.request_id);
		})
		//sign this thing
		.then((certFileName) => { return signPublicUserKey(certFileName, userCa, identity, principal, comment, validity) })
		.then((returnedKey) => { 
			//save the signed key
			signedKey = returnedKey;
			//mark the request as complete
			return requestController.completeRequest(req.body.request_id);
		}).then((result) => { return fileHelper.deletePublicKey(req.body.request_id) })
		.then(() => {
			res.status(200).json({ status: 200, data: [{"signedkey" : signedKey}] });
		})
		.catch((err) => { res.status(400).json({ status: 400, data: null, message: err.message }); });
}
