

const express = require('express');
const app = express();

const path = require(`path`);
const bodyParser = require('body-parser');


const axios = require('axios');

const { Datastore } = require('@google-cloud/datastore');

const datastore = new Datastore();

const {OAuth2Client} = require('google-auth-library');

// INPUT CREDS
// actual values of these creds have been removed
const CLIENT_ID = "";
const CLIENT_SECRET = "";

const client = new OAuth2Client(CLIENT_ID); 


//------------------------------------------


app.use(bodyParser.json());


//---------------- Functions ---------------


/*
Posts the state into the datastore database
*/
async function post_state(state_int) {
	
    var key = datastore.key('State');
    
    var state_str = "" + state_int + "";
    
    var new_state = { "state_val": state_str };
    
    await datastore.insert({ "key": key, "data": new_state });
    
    
}


/*
Returns true is state is correctly verified and false if not
*/
async function verify_state(sent_state) {

	var state_q = datastore.createQuery('State').filter('state_val', '=', sent_state);
	
	var state_resp = await datastore.runQuery(state_q);
	
	var state_list = state_resp[0];
	
	if (state_list.length == 0){
	
		return false;
		
	} else {
	
		return true;
	}

}


/* 
The following function is adapted from the code in "Verify the integrity of the ID token" section
of the Google Sign-In for Websites, 'Authenticate with a backend server' guide, found 
at URL: https://developers.google.com/identity/sign-in/web/backend-auth
*/

async function verify_jwt(id_token){

	var ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: CLIENT_ID 
  	});
  	
  	var payload = await ticket.getPayload();
  	
  	
  	var user = payload['sub'];
  	
  	return user;
  
}


/*
Creates new user
*/
async function create_user_if_new(user_sub){
	
	var query = datastore.createQuery('User').filter('user_id', '=', user_sub);
	
	var result = await datastore.runQuery(query);
	
	console.log(result);
	
	if (result[0].length == 0){
	
		var key = datastore.key('User');
		var new_user = { "user_id": user_sub };
   		await datastore.insert({ "key": key, "data": new_user });
    	return user_sub;
		
	} else {
	
		return user_sub;
	
	}


}

/*
Posts a new boat into the datastore database
*/
async function post_boat(name, type, length, sub){

	var key = datastore.key('Boat');
	var new_boat = { "name": name, "type": type, "length": parseInt(length, 10), "owner": sub };
    await datastore.insert({ "key": key, "data": new_boat });
    return key;

}

/*
Posts a new load into the datastore database
*/
async function post_load(content, quantity) {
	var key = datastore.key('Load');
	var new_load = {};
	new_load.content = content;
	new_load.quantity = parseInt(quantity, 10);
	new_load.carrier = null;
	
	var date = new Date();
	
	var curr_date = date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear();
	new_load.creation_date = curr_date;
	
	await datastore.insert({"key": key, "data": new_load});
	return key;

}

/*
Updates a load by replacing its data
*/
async function update_load(load_id, new_load_data) {

	var key = datastore.key(['Load', parseInt(load_id, 10)]);
	
	await datastore.update({ "key": key, "data": new_load_data });

}

/*
Updates a load by patching its data
*/
async function update_load_patch(load_id, req, res) {

	var result = await get_load(load_id);
	 
	if (result == false) {
		var err_msg = {"Error": "No load with this load_id exists"};
        res.status(404).json(err_msg);
        
    } else {
    	
    	var new_load_data = {};
    	new_load_data.creation_date = result.creation_date;
		new_load_data.carrier = result.carrier;
    	
    	if (req.body.hasOwnProperty("quantity") && req.body.hasOwnProperty("content")) {
    		
    		new_load_data.quantity = req.body.quantity;
    		new_load_data.content = req.body.content;
    		
    		await update_load(load_id, new_load_data);
    		
    		var updated_load = await get_load(load_id);
    		var load_res = {};
    		load_res.id = updated_load[datastore.KEY].id;
    		load_res.content = updated_load.content;
    		load_res.quantity = updated_load.quantity;
    		load_res.creation_date = updated_load.creation_date;
    		
    		if (updated_load.carrier != null) {
    			var carrier_boat = await get_boat_for_load(updated_load.carrier, req.hostname);
    		} else {
    			var carrier_boat = updated_load.carrier;
    		}
    		
    		load_res.carrier = carrier_boat;
    		load_res.self = 'https://' + req.hostname + '/loads/' + load_id;
            			
            res.status(200).json(load_resp);
    		
    		
    	} else if (req.body.hasOwnProperty("quantity")) {
    	
    		new_load_data.quantity = req.body.quantity;
    		new_load_data.content = result.content;
    		
    		await update_load(load_id, new_load_data);
    		
    		var updated_load = await get_load(load_id);
    		var load_res = {};
    		load_res.id = updated_load[datastore.KEY].id;
    		load_res.content = updated_load.content;
    		load_res.quantity = updated_load.quantity;
    		load_res.creation_date = updated_load.creation_date;
    		
    		if (updated_load.carrier != null) {
    			var carrier_boat = await get_boat_for_load(updated_load.carrier, req.hostname);
    		} else {
    			var carrier_boat = updated_load.carrier;
    		}
    		
    		load_res.carrier = carrier_boat;
    		load_res.self = 'https://' + req.hostname + '/loads/' + load_id;
            			
            res.status(200).json(load_resp);
    		
    		    	
    	} else if (req.body.hasOwnProperty("content")) {
    	
    		new_load_data.quantity = result.quantity;
    		new_load_data.content = req.body.content;
    		
    		await update_load(load_id, new_load_data);
    		
    		var updated_load = await get_load(load_id);
    		var load_res = {};
    		load_res.id = updated_load[datastore.KEY].id;
    		load_res.content = updated_load.content;
    		load_res.quantity = updated_load.quantity;
    		load_res.creation_date = updated_load.creation_date;
    		
    		if (updated_load.carrier != null) {
    			var carrier_boat = await get_boat_for_load(updated_load.carrier, req.hostname);
    		} else {
    			var carrier_boat = updated_load.carrier;
    		}
    		
    		load_res.carrier = carrier_boat;
    		load_res.self = 'https://' + req.hostname + '/loads/' + load_id;
            			
            res.status(200).json(load_res);
    		    	
    	} else {
    	
    		var err_msg = {"Error": "No properties provided to update"};
    		res.status(400).json(err_msg);
    	}
	}

}


/*
Updates a boat by replacing its data
*/
async function update_boat_put(id, sub, req, res) {

	if (req.body.hasOwnProperty("name") && req.body.hasOwnProperty("type") && req.body.hasOwnProperty("length")) {
		var new_boat_data = {};
    	new_boat_data.name = req.body.name;
		new_boat_data.type = req.body.type;
		new_boat_data.length = req.body.length;
		new_boat_data.owner = sub;
		
		var key = datastore.key(['Boat', parseInt(id, 10)]);
	
		await datastore.update({ "key": key, "data": new_boat_data });
		
    	var updated_boat = await get_boat(id);
    	var boat_res = {};
    	boat_res.id = updated_boat[datastore.KEY].id;
    	boat_res.name = updated_boat.name;
    	boat_res.type = updated_boat.type;
    	boat_res.length = updated_boat.length;
    	
    	var boat_loads = await get_full_loads_for_boat(id, req.hostname);
    	
    	boat_res.loads = boat_loads;
    	
    	boat_res.self = 'https://' + req.hostname + '/boats/' + id;
            			
        res.status(200).json(boat_res);
    		    	

	} else {
		
		var err_msg = {"Error": "At least one of the required properties is missing"};
		res.status(400).json(err_msg);
	
	}

}

/*
Updates a boat by patching its data
*/
async function update_boat_patch(id, sub, req, res) {

	if (req.body.hasOwnProperty("name") && req.body.hasOwnProperty("type") && req.body.hasOwnProperty("length")) {
		var new_boat_data = {};
    	new_boat_data.name = req.body.name;
		new_boat_data.type = req.body.type;
		new_boat_data.length = req.body.length;
		new_boat_data.owner = sub;
		
		var key = datastore.key(['Boat', parseInt(id, 10)]);
	
		await datastore.update({ "key": key, "data": new_boat_data });
		
    	var updated_boat = await get_boat(id);
    	var boat_res = {};
    	boat_res.id = updated_boat[datastore.KEY].id;
    	boat_res.name = updated_boat.name;
    	boat_res.type = updated_boat.type;
    	boat_res.length = updated_boat.length;
    	
    	var boat_loads = await get_full_loads_for_boat(id, req.hostname);
    	
    	boat_res.loads = boat_loads;
    	
    	boat_res.self = 'https://' + req.hostname + '/boats/' + id;
            			
        res.status(200).json(boat_res);
    		    	
	
	} else if (req.body.hasOwnProperty("name") || req.body.hasOwnProperty("type") || req.body.hasOwnProperty("length")) {
	
		var old_boat = await get_boat(id);
		
		var new_boat_data = {};
		new_boat_data.owner = sub;
		
		if (req.body.hasOwnProperty("name")){
		
			new_boat_data.name = req.body.name;
		} else {
			new_boat_data.name = old_boat.name;
		}
		
		if (req.body.hasOwnProperty("type")){
		
			new_boat_data.type = req.body.type;
		} else {
			new_boat_data.type = old_boat.type;
		}
		
		if (req.body.hasOwnProperty("length")){
		
			new_boat_data.length = req.body.length;
		} else {
			new_boat_data.length = old_boat.length;
		}
		
		var key = datastore.key(['Boat', parseInt(id, 10)]);
	
		await datastore.update({ "key": key, "data": new_boat_data });
		
    	var updated_boat = await get_boat(id);
    	var boat_res = {};
    	boat_res.id = updated_boat[datastore.KEY].id;
    	boat_res.name = updated_boat.name;
    	boat_res.type = updated_boat.type;
    	boat_res.length = updated_boat.length;
    	
    	var boat_loads = await get_full_loads_for_boat(id, req.hostname);
    	
    	boat_res.loads = boat_loads;
    	
    	boat_res.self = 'https://' + req.hostname + '/boats/' + id;
            			
        res.status(200).json(boat_res);
    		    	

	} else {
		
		var err_msg = {"Error": "No properties provided to update"};
		res.status(400).json(err_msg);
	
	}


}


/*
Deletes a load
*/
async function del_load(load_id, req, res) {
	
	var result = await get_load(load_id);
	
	if (result == false) {
	
		res.status(404).end();
	
	} else {
	
		var key = datastore.key(['Load', parseInt(load_id, 10)]);
    	await datastore.delete(key);
    	
    	res.status(204).end();
	
	}
	
}

/*
Gets a boat entity
*/
async function get_boat(id){

	var key = datastore.key(['Boat', parseInt(id, 10)]);
	
    var entity = await datastore.get(key);
    
    if (entity[0] === undefined || entity[0] === null) {
        // No entity found
            return false;
        } else {
          // This would be the boat object   
            return entity[0];
        }

}

/*
Gets a boat with full info
*/
async function get_full_boat(id, host_name) {
	
	var boat_res = await get_boat(id);
	
	var boat_obj = {};
	  		
    boat_obj.id = boat_res[datastore.KEY].id;
    boat_obj.name = boat_res.name;
    boat_obj.type = boat_res.type;
    boat_obj.length = boat_res.length;	
    boat_obj.owner = boat_res.owner;
    
    var full_loads = await get_full_loads_for_boat(id, host_name);
    
    boat_obj.loads = full_loads;
    
    boat_obj.self = 'https://' + host_name + '/boats/' + boat_obj.id;
   
   	return boat_obj;
}

/*
Returns a list of loads with full info for a particular boat
*/
async function get_full_loads_for_boat(id, host_name){
	var boat_id = parseInt(id, 10);
	var query = datastore.createQuery('Load').filter('carrier', '=', boat_id);
	
	var load_list = await datastore.runQuery(query);
	
	var result_load_list = [];
	var x = 0;
	
	for (var load of load_list[0]){
		var the_load = {};
		the_load.id = load[datastore.KEY].id;
		the_load.content = load.content;
		the_load.quantity = load.quantity;
		the_load.carrier = load.carrier;
		the_load.creation_date = load.creation_date;
		the_load.self = "https://" + host_name + "/loads/" + the_load.id;
		
		result_load_list[x] = the_load;
		x += 1;
		
	}
	
	return result_load_list;
}

/*
Gets a load by id
*/
async function get_load(id){

	var key = datastore.key(['Load', parseInt(id, 10)]);
	
    var entity = await datastore.get(key);
    
    if (entity[0] === undefined || entity[0] === null) {
        // No entity found
            return false;
        } else {
          // This would be the boat object   
            return entity[0];
        }

}


/*
Returns list of all users
*/
async function get_all_users() {

	var query  = datastore.createQuery('User');
	var result = await datastore.runQuery(query);
	var result_user_list = [];
	var x = 0;
	
	for (var user of result[0]){
		var the_user = {};
		the_user.user_id = user.user_id;
		result_user_list[x] = the_user;
		x += 1;
	}
	return result_user_list;
}


/*
Returns all loads in paginated form
*/
async function get_all_loads(host_name, req){
	
	// count total loads first
	
	var query1  = datastore.createQuery('Load');
	var result1 = await datastore.runQuery(query1);
	var all_loads_list = result1[0];
	var total_loads = all_loads_list.length;
	
	////
	
	var loads_q = datastore.createQuery('Load').limit(5);
	
	var results = {};
	results.total_items = total_loads;
	
	if(Object.keys(req.query).includes("cursor")){
		loads_q = loads_q.start(req.query.cursor);
	}

	var entities = await datastore.runQuery(loads_q);
	
	var result_load_list = [];
	var x = 0;
	
	for (var load of entities[0]){
		var the_load = {};
		
		the_load.id = load[datastore.KEY].id;
		the_load.quantity = load.quantity;
		
		
        var boat_x = await get_boat_for_load(load.carrier, host_name);
        
        the_load.carrier = boat_x;
        the_load.content = load.content;
        the_load.creation_date = load.creation_date;
        
        the_load.self = "https://" + host_name + "/loads/" + the_load.id;
        
        
        
        result_load_list[x] = the_load;
        x += 1; 
	}
	
	results.items = result_load_list;
	
	if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
        results.next = "https://" + req.get("host") + req.baseUrl + "/loads/" + "?cursor=" + encodeURIComponent(entities[1].endCursor);
    }
	
	return results;

}


/*
Returns a valid boat owner's boats in paginated form
*/
async function get_valid_owner_boats(sub, host_name, req) {

	// count total of owner's boats first
	
	var query1  = datastore.createQuery('Boat').filter('owner', '=', sub);
	var result1 = await datastore.runQuery(query1);
	var all_boats_list = result1[0];
	var total_boats = all_boats_list.length;
	
	////
	
	var boats_q = datastore.createQuery('Boat').filter('owner', '=', sub).limit(5);
	
	var results = {};
	results.total_items = total_boats;
	
	if(Object.keys(req.query).includes("cursor")){
		boats_q = boats_q.start(req.query.cursor);
	}

	var entities = await datastore.runQuery(boats_q);
	
	var result_boat_list = [];
	var x = 0;
	
	for (var boat of entities[0]){
		var the_boat = {};
		
		the_boat.id = boat[datastore.KEY].id;
		
		
		the_boat.name = boat.name;
		the_boat.type = boat.type;
		the_boat.length = boat.length;
		the_boat.owner = boat.owner;
		
		
        var load_list = await get_loads_for_boat(the_boat.id, host_name);
        
        the_boat.loads = load_list;
        the_boat.self = "https://" + host_name + "/boats/" + the_boat.id;    
        
        result_boat_list[x] = the_boat;
        x += 1; 
	}
	
	results.items = result_boat_list;
	
	if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
        results.next = "https://" + req.get("host") + req.baseUrl + "/boats/" + "?cursor=" + encodeURIComponent(entities[1].endCursor);
    }
	
	/// note: the next link must be used along with correct auth header jwt to work
	
	return results;

}

/*
Returns a list of loads for a boat
*/
async function get_loads_for_boat(id, host_name){
	var boat_id = parseInt(id, 10);
	var query = datastore.createQuery('Load').filter('carrier', '=', boat_id);
	
	var load_list = await datastore.runQuery(query);
	
	var result_load_list = [];
	var x = 0;
	
	
	for (var load of load_list[0]){
		var the_load = {};
		the_load.id = load[datastore.KEY].id;
		
		the_load.self = "https://" + host_name + "/loads/" + the_load.id;
		
		result_load_list[x] = the_load;
		x += 1;
		
	}
	
	return result_load_list;
}

/*
Returns the boat of a load
*/
async function get_boat_for_load(carrier, host_name){
	
	if (carrier == null) {
		return null;
	}
	
	
	var key = datastore.key(['Boat', parseInt(carrier, 10)]);
    var entity = await datastore.get(key);
    
    if (entity[0] === undefined || entity[0] === null) {
        // No entity found
            return null;
    } else {
        // This would be the boat object   
        var the_boat = entity[0];
        var boat = {};
            
        var b_id = the_boat[datastore.KEY].id;
            
        boat.id = parseInt(b_id, 10);
            
        boat.name = the_boat.name;
        
        boat.self = "https://" + host_name + "/boats/" + the_boat.id;
            
        return boat;
    }

}

/*
Deletes a boat
*/
async function delete_boat(sub, boat_id) {

	var b_id = parseInt(boat_id, 10);
	
	var boat = await get_boat(b_id);
	
	if (boat == false) {
	
		// no boat with that id was found 
		return 4032;
		
	} else {
	
		if (boat.owner != sub) {
		
			// the boat belongs to someone else
			
			return 4031;
		
		} else {
			// valid owner and boat, update the carrier property of its loads,
			// delete happens here, and returns 204 as the number
			
			var query = datastore.createQuery('Load').filter('carrier', '=', b_id);
	
			var load_list = await datastore.runQuery(query);
	
			var result_load_list = [];
			var x = 0;
	
			for (var load of load_list[0]){
				var the_load = load[datastore.KEY].id;
				result_load_list[x] = the_load;
				x += 1;
			}
	
			for (var load_x of result_load_list){
				// removing all loads from the boat
				await remove_load_from_boat(b_id, load_x);
			
			}
			
			// deletion of boat
			var key = datastore.key(['Boat', b_id]);
    		await datastore.delete(key);
    		return 204;
		}
	
	}

}

/*
Removes a load from a boat
*/
async function remove_load_from_boat(boat_id, load_id){
	var load_obj = await get_load(parseInt(load_id, 10));
	
	var key = datastore.key(['Load', parseInt(load_id, 10)]);
	
	var load_props = {};
			
	load_props.quantity = load_obj.quantity;
	load_props.carrier = null;
	load_props.content = load_obj.content;
	load_props.creation_date = load_obj.creation_date;	
		
	await datastore.update({ "key": key, "data": load_props });
	
}



/*
Puts a load on a boat
*/
async function assign_load_to_boat(boat_id, load_id){
	var load_obj = await get_load(parseInt(load_id, 10));
	
	var key = datastore.key(['Load', parseInt(load_id, 10)]);

		
	var load_props = {};
			
	load_props.quantity = load_obj.quantity;
	load_props.carrier = parseInt(boat_id, 10);
	load_props.content = load_obj.content;
	load_props.creation_date = load_obj.creation_date;	
		
	await datastore.update({ "key": key, "data": load_props });
	
}




//---------------- Routes ------------------

// Renders the welcome page
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/views/form.html'));
});


// Redirects to Google Oauth 2.0 endpoint
app.get('/submit', function (req, res) {


	// GENERATE THE RANDOM STATE AND STORE IT IN DATASTORE
	
	console.log("Entered submit");
	
	var min = Math.ceil(100000);
	var max = Math.floor(999999999999999);
	var rand_int =  Math.floor(Math.random() * (max - min) + min);
	
	console.log("Before posting to Datastore");
	
	post_state(rand_int).then(() => {
	
	// UPDATE REDIRECT URI
	var get_request_url = "https://accounts.google.com/o/oauth2/v2/auth?" +
 		"response_type=code&client_id=" + CLIENT_ID + 
 		"&redirect_uri=https://assignment-9-magadia.uc.r.appspot.com/oauth" + 
 		"&scope=https://www.googleapis.com/auth/userinfo.profile" + "&state=" + rand_int;
 	
 	console.log("Before get");
 	
 	
 	
 	res.redirect(get_request_url);
 	
 	});

});


// Gets the authorization token containing the JWT from Google and displays it to user
// along with their user id (the sub value). Also creates the User entity in the datastore
// if they are new 
app.get('/oauth', function (req, res) {
	
	var sent_state = req.query.state;
	var sent_code = req.query.code;
	
	console.log(sent_state);
	console.log(sent_code);
	
	// VERIFY STATE WITH QUERY 
	
	verify_state(sent_state).then((bool_result) => {
		
		if (bool_result == false) {
		
			res.send("Error with state not being found.");
			
		} else {
		
			console.log("before post to get access token");
			
			// OBTAIN ACCESS TOKEN FROM GOOGLE 
			
			// UPDATE REDIRECT URI
			axios.post('https://oauth2.googleapis.com/token', {
			
				code: sent_code,
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				redirect_uri: "https://assignment-9-magadia.uc.r.appspot.com/oauth",
				grant_type: "authorization_code"
			
			}).then((token_resp) => {
				
				// id_token is the JWT
				
				verify_jwt(token_resp.data.id_token).then((user_sub) => {
				
					create_user_if_new(user_sub).then((user_id) => {
					
						// SEND USER ID AS WELL AS JWT
						res.send('User Info: ' + '\n\nYour User ID: ' + '[' + user_sub + ']' + ', ' + '\nYour JWT: \n' + token_resp.data.id_token);
					});
				
				
				// catch error of verify_jwt
				}).catch((error) => {
		
					console.log(error);
			
					// sends 401 for invalid jwt
					res.status(401).end();
		
				});	
				
				
			// this catch is for the axios request
			}).catch((error) => {
			
				if (error.response) {
      				// if the server sent back an error
      				
      				console.log(error.response.data);
      				console.log(error.response.status);
      				console.log(error.response.headers);
      				
    			} else if (error.request) {
      				// if error with the request sent 
      				
      				console.log(error.request);
      				
   				 } else {
      				
      				//some other error 
     		 		console.log('Error: ' + error.message);
   				 }
				
			});
		
		}
	
				
	});

});


// Unprotected endpoint to get a list of all users currently registered in the app
app.get('/users', function (req, res) {

	if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
        
    } else {
    
	get_all_users().then((user_list) => {
		
		var user_res = {};
		user_res.items = user_list;
		
		var count = user_list.length;
		
		user_res.total_items = count;
		
		res.status(200).json(user_res);
	
	});
	
	}
});



// Protected endpoint for a user to create a new boat
app.post('/boats', function (req, res) {

	// get the authorization token from authorization Header which says 'Bearer 'token''
	
	if (req.get('Authorization') === undefined) {
	
		res.status(401).end();
	
	} else if (req.accepts('application/json') === false){
		
        res.status(406).end(); // CHECK STATUS CODE 
	
	} else {
	
	if (req.body.hasOwnProperty("name") && req.body.hasOwnProperty("type") && req.body.hasOwnProperty("length")) {
	
	var head = req.get('Authorization');
	
	if (head.startsWith('Bearer ')){
	
		// get the token value part of the header, the jwt
		
		var tok = head.slice(7);
		
		// verify the jwt, which sends back the sub value or throws an error
		
		verify_jwt(tok).then((res_sub) => {
		
			// post the boat with sub from jwt as boat owner
			
			
			post_boat(req.body.name, req.body.type, req.body.length, res_sub)
        	.then((key_x) => {
        	
        		//get the posted boat and send response 
        		get_boat(key_x.id).then((resp) => {
        		
        		var result = {};
        		result.id = parseInt(key_x.id, 10);
        		result.name = resp.name;
        		result.type = resp.type;
        		result.length = resp.length;	
        		result.owner = resp.owner;
        		result.loads = []; 	// a new boat will not have any loads
        		result.self = 'https://' + req.hostname + '/boats/' + key_x.id;
        		
        		res.status(201).json(result);
	
				});
			});
			
		
		}).catch((error) => {
		
			
			
			// sends 401 for invalid jwt
			res.status(401).end();
		
		});	
		
	
	} else {
	
		// error with authorization header format
		res.status(401).end();
	
	}
	} else {
		var err_msg = {"Error": "The request object is missing at least one of the required attributes"};
		res.status(400).json(err_msg);
	}
	}
});


//unprotected endpoint - create a load
app.post('/loads', function (req, res){

	if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
    } else {
	if (req.body.hasOwnProperty("quantity") && req.body.hasOwnProperty("content")){
		post_load(req.body.content, req.body.quantity).then((key_x) => {
			
				get_load(key_x.id).then((resp) =>{
				
					var result = {};
					result.id = parseInt(key_x.id, 10);
					result.content = resp.content;
					result.quantity = resp.quantity;
					result.creation_date = resp.creation_date;
					result.carrier = resp.carrier; // will be NULL since all new loads are unassigned
					result.self = 'https://' + req.hostname + '/loads/' + key_x.id;
					
					res.status(201).json(result);
				
				});		
			});
	} else {
		var err_msg = {"Error": "The request object is missing at least one of the required attributes"};
		res.status(400).json(err_msg);
	}
	}
});



// unprotected, collection url - view all loads, paginated 
app.get('/loads', function (req, res) {

	if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE
    } else {
    
	get_all_loads(req.hostname, req).then((result) => {
    	res.status(200).json(result);
    	
    });  
	}
});


// unprotected - view a specific load
app.get('/loads/:id', function (req, res) {
	if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
    } else {
    
    get_load(req.params.id).then((result) => {
            if (result == false) {
            	var err_msg = {"Error": "No load with this load_id exists"};
                res.status(404).json(err_msg);
            } else {
            	var load_resp = {};
            	load_resp.id = parseInt(req.params.id, 10);
            	
            	load_resp.content = result.content;
            	load_resp.quantity = result.quantity;
            	
            	if (result.carrier != null){
            		get_boat_for_load(result.carrier, req.hostname).then((boat_res) => {
            		
            			load_resp.carrier = boat_res;
            			load_resp.creation_date = result.creation_date;
            			load_resp.self = 'https://' + req.hostname + '/loads/' + req.params.id;
            			
            			res.status(200).json(load_resp);
            			
            		});
            	} else {
            	
            		load_resp.carrier = result.carrier;
            		load_resp.creation_date = result.creation_date;
            		load_resp.self = 'https://' + req.hostname + '/loads/' + req.params.id;
            		
            		res.status(200).json(load_resp);
            	}
            }
        });
    }
});



// unprotected - update a load fully with PUT
app.put('/loads/:id', function (req, res) {

	if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
        
    } else {
    
	get_load(req.params.id).then((result) => {
		if (result == false) {
			var err_msg = {"Error": "No load with this load_id exists"};
            res.status(404).json(err_msg);
        } else {
			if (req.body.hasOwnProperty("quantity") && req.body.hasOwnProperty("content")) {
				var new_load_data = {};
				new_load_data.content = req.body.content;
				new_load_data.quantity = req.body.quantity;
				new_load_data.creation_date = result.creation_date;
				new_load_data.carrier = result.carrier;
				
				update_load(req.params.id, new_load_data).then(() => {
					get_load(req.params.id).then((updated_load) => {
					
						var load_resp = {};
            			load_resp.id = updated_load[datastore.KEY].id;
            			load_resp.content = updated_load.content;
            			load_resp.quantity = updated_load.quantity;
            	
						if (updated_load.carrier != null) {
						
            				get_boat_for_load(updated_load.carrier, req.hostname).then((boat_res) => {
            		
            					load_resp.carrier = boat_res;
            					load_resp.creation_date = updated_load.creation_date;
            					load_resp.self = 'https://' + req.hostname + '/loads/' + req.params.id;
            			
            					res.status(200).json(load_resp);
            			
            				});

						} else {
            				load_resp.carrier = updated_load.carrier;
            				load_resp.creation_date = updated_load.creation_date;
            				load_resp.self = 'https://' + req.hostname + '/loads/' + req.params.id;
            		
            				res.status(200).json(load_resp);			
						}
					});	
				});
					
			} else {
				var err_msg = {"Error": "All properties have to be updated for PUT"};
				res.status(400).json(err_msg);
			}
		}
	});
	}
});


// unprotected - update a load partially with PATCH
app.patch('/loads/:id', function (req, res) {
	
	if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
    } else {
	update_load_patch(req.params.id, req, res).catch((error) =>{
	
		console.log(error);
	
	});
	}
});


// unprotected - delete a load 
app.delete('/loads/:id', function (req, res) {
	del_load(req.params.id, req, res);

});



// Protected url to fully edit a specific boat of a registered user with PUT
app.put('/boats/:id', function (req, res) {

	if (req.get('Authorization') === undefined) {
	
		res.status(401).end();
	
	}else if (req.accepts('application/json') === false){

    	
        res.status(406).end(); // CHECK STATUS CODE 
		
	} else {
	
		var head = req.get('Authorization');
	
		if (head.startsWith('Bearer ')){
	
			// get the token value part of the header, the jwt
		
			var tok = head.slice(7);
		
		// verify the jwt, which sends back the sub value or throws an error
		
			verify_jwt(tok).then((res_sub) => {
		
			// check boat exists, then return boat json
				
				get_boat(req.params.id).then((result) => {
				
					if (result == false) {
						
						// the boat did not exist
						var err_msg = {"Error": "No boat with this boat_id exists"};
						res.status(404).json(err_msg);
					
					} else {
					
						if (result.owner == res_sub) {
							// successful auth
							///////////
							update_boat_put(req.params.id, res_sub, req, res);
						
						} else {
							// the boat did not belong to that person
							var err_msg = {"Error": "The boat belongs to someone else"};
							res.status(403).json(err_msg);
						}
					}
				
				});
				
			}).catch((error) => {
		
			// invalid jwt
			
				res.status(401).end();
			
			});
			
		} else {
	
		// invalid authorization header
		
			res.status(401).end();
		}
	}

});



// Protected url to partially edit a specific boat of a registered user with PATCH
app.patch('/boats/:id', function (req, res) {

	if (req.get('Authorization') === undefined) {
	
		res.status(401).end();
	
	} else if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
		
	} else {
	
		var head = req.get('Authorization');
	
		if (head.startsWith('Bearer ')){
	
			// get the token value part of the header, the jwt
		
			var tok = head.slice(7);
		
		// verify the jwt, which sends back the sub value or throws an error
		
			verify_jwt(tok).then((res_sub) => {
		
			// check boat exists, then return boat json
				
				get_boat(req.params.id).then((result) => {
				
					if (result == false) {
						
						// the boat did not exist
						var err_msg = {"Error": "No boat with this boat_id was found"};
						res.status(404).json(err_msg);
					
					} else {
					
						if (result.owner == res_sub) {
							// successful auth
							///////////
							update_boat_patch(req.params.id, res_sub, req, res);
						
						} else {
							// the boat did not belong to that person
							var err_msg = {"Error": "The boat belongs to someone else"};
							res.status(403).json(err_msg);
						}
					}
				
				});
				
			}).catch((error) => {
		
			// invalid jwt
			
				res.status(401).end();
			
			});
			
		} else {
	
		// invalid authorization header
		
			res.status(401).end();
		}
	}

});



// Protected collection url to get all boats of a registered user, paginated
app.get('/boats', function (req, res) {

	if (req.get('Authorization') === undefined) {
	
		res.status(401).end();
		
	} else if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 
	
	} else {
	
		var head = req.get('Authorization');
	
		if (head.startsWith('Bearer ')){
	
			// get the token value part of the header, the jwt
		
			var tok = head.slice(7);
		
		// verify the jwt, which sends back the sub value or throws an error
		
			verify_jwt(tok).then((res_sub) => {
		
			//// PAGINATE AND PUT THE LOADS IN FOR EACH BOAT, send json results page
				get_valid_owner_boats(res_sub, req.hostname, req).then((boats_res) => {
			
					res.status(200).json(boats_res);
				});
			
			}).catch((error) => {
		
			// invalid jwt
			
				res.status(401).end();
			
			});
			
		} else {
	
		// invalid authorization header
		
			res.status(401).end();
		}
	}

});


// Protected url to view a specific boat of a registered user
app.get('/boats/:id', function (req, res) {

	if (req.get('Authorization') === undefined) {
	
		res.status(401).end();
		
	} else if (req.accepts('application/json') === false){
    	
        res.status(406).end(); // CHECK STATUS CODE 

		
	} else {
	
		var head = req.get('Authorization');
	
		if (head.startsWith('Bearer ')){
	
			// get the token value part of the header, the jwt
		
			var tok = head.slice(7);
		
		// verify the jwt, which sends back the sub value or throws an error
		
			verify_jwt(tok).then((res_sub) => {
		
			// check boat exists, then return boat json
				
				get_boat(req.params.id).then((result) => {
				
					if (result == false) {
						
						// the boat did not exist
						var err_msg = {"Error": "No boat with that boat_id exists"};
						res.status(404).json(err_msg);
					
					} else {
					
						if (result.owner == res_sub) {
						
							get_full_boat(req.params.id, req.hostname).then((boat_obj) => {
							
								res.status(200).json(boat_obj);
							});
						
						} else {
							// the boat did not belong to that person
							var err_msg = {"Error": "The boat belongs to someone else"};
							res.status(403).json(err_msg);
						}
					}
				
				});
				
			}).catch((error) => {
		
			// invalid jwt
			
				res.status(401).end();
			
			});
			
		} else {
	
		// invalid authorization header
		
			res.status(401).end();
		}
	}

});


// Protected url to delete a specific boat of a registered user
app.delete('/boats/:boat_id', function (req, res) {

	if (req.get('Authorization') === undefined) {
	
		// Missing Authorization header, return status 401 
		
			res.status(401).end();
			
	} else {
	
	var head = req.get('Authorization');
	
	if (head.startsWith('Bearer ')){
	
		// get the token value part of the header, the jwt
		
		var tok = head.slice(7);
		
		// verify the jwt, which sends back the sub value or throws an error
		
		verify_jwt(tok).then((res_sub) => {
			// valid jwt
			
			delete_boat(res_sub, req.params.boat_id).then((stat_num) => {
			
			
				
				if (stat_num == 204) {
				
					res.status(204).end();
					
				} else if (stat_num == 4031) {
					
					
					
					res.status(403).end();
					
				} else if (stat_num == 4032) {
				
					
					
					res.status(404).end();
				}
				
			});
		
		}).catch((error) => {
		
			// it was an invalid jwt, return status 401
			res.status(401).end();
		});
		
	} else {
	
		// invalid Authorization header, return status 401
		
		res.status(401).end();
	
	}
	}

});


// Unprotected url - Assigning a load to a boat (check if the boat exists and load exists, and if the load is not already assigned to another boat)
app.put('/boats/:boat_id/loads/:load_id', function (req, res){
	get_boat(req.params.boat_id).then((boat_result) => {
	
		if (boat_result == false) {
			var err_msg = {"Error": "The specified boat and/or load does not exist"};
			res.status(404).json(err_msg);
		} else {
		
		get_load(req.params.load_id).then((load_result) => {
		
			if (load_result == false) {
				var err_msg = {"Error": "The specified boat and/or load does not exist"};
				res.status(404).json(err_msg);
			
			} else if (load_result.carrier != null) {
				var err_msg = {"Error": "The specified load is assigned to another boat"};
				res.status(403).json(err_msg);
			
			} else {
				
				assign_load_to_boat(req.params.boat_id, req.params.load_id).then(()=> res.status(204).end());
			}
		});
		}
	});

});


//Unprotected url - Removing a load from a boat (check if the boat exists and the load exists and that the load is currently assigned to the boat)
app.delete('/boats/:boat_id/loads/:load_id', function (req, res){

	var b_id = parseInt(req.params.boat_id, 10);
	
	get_boat(req.params.boat_id).then((boat_result) => {
	
		if (boat_result == false) {
			var err_msg = {"Error": "The specified boat and/or load does not exist"};
			res.status(404).json(err_msg);
		} else {
		
		get_load(req.params.load_id).then((load_result) => {
		
			if (load_result == false) {
				var err_msg = {"Error": "The specified boat and/or load does not exist"};
				res.status(404).json(err_msg);
			
			} else if (load_result.carrier != b_id) {
				var err_msg = {"Error": "The specified load is not assigned to the specified boat"};
				res.status(403).json(err_msg);
			
			} else {
				
				remove_load_from_boat(req.params.boat_id, req.params.load_id).then(()=> res.status(204).end());
			}
		});
		}
	});


});


// Invalid url - all boats cannot be deleted 
app.delete('/boats', function (req, res){

	res.status(405).end();

});


// Invalid url - all loads cannot be deleted 
app.delete('/loads', function (req, res){

	res.status(405).end();

});


// Invalid url - all boats cannot be replaced
app.put('/boats', function (req, res){
	
	res.status(405).end();

});


// Invalid url - all loads cannot be replaced
app.put('/loads', function (req, res){
	
	res.status(405).end();

});

// Invalid url - all boats cannot be edited at once
app.patch('/boats', function (req, res){
	
	res.status(405).end();

});


// Invalid url - all loads cannot be edited at once
app.patch('/loads', function (req, res){
	
	res.status(405).end();

});



/*

References:

I referenced and used code from some of my previous assignments in this class for this assignment, 
particularly, assignments 4 and 7.

Reference for using Google OAuth 2.0. Using OAuth 2.0 for Web Server Applications. 
URL: https://developers.google.com/identity/protocols/oauth2/web-server

Reference for Google OAuth verifying JWT. Google Identity. Google Sign-In for Websites.
Authenticate with a backend server. URL: https://developers.google.com/identity/sign-in/web/backend-auth

Reference for Express methods. Express. 4.x API. URL: http://expressjs.com/en/api.html

Reference for startsWith() method. Developer.Mozilla. String.prototype.startsWith().
URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith

Reference for slice() method. Developer.Mozilla. String.prototype.slice().
URL:https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice

Reference for how to get token value from Authorization header. Stack Overflow. 
How to extract token string from Bearer token?. URL: https://stackoverflow.com/questions/50284841/how-to-extract-token-string-from-bearer-token


Reference for generating a random number for state. Developer.Mozilla. Math.random().
URL: https://developers.google.com/identity/protocols/oauth2/web-server#redirecting


Reference for using Axios for making requests. npm. axios. 
URL: https://www.npmjs.com/package/axios


Reference for using Axios. LogRocket. How to make HTTP Requests with Axios. 
URL: https://blog.logrocket.com/how-to-make-http-requests-like-a-pro-with-axios/

Reference for sending requests and their parameters. Canvas. CS 493 Fall 2021 Cloud Application 
Development. Exploration - OAuth 2.0 Flow Example. 
URL: https://canvas.oregonstate.edu/courses/1830399/pages/exploration-oauth-2-dot-0-flow-example?module_item_id=21620377


Reference for Datastore methods. Source: Google Cloud: Entities, properties, and keys.
URL: https://cloud.google.com/datastore/docs/concepts/entities

Reference for Datastore methods. Source: Google APIs: Datastore. 
URL: https://googleapis.dev/nodejs/datastore/latest/Datastore.html

My code in this file is based on some of the code in the Lodging V2  
files provided in our class exploration, Exploration - Google App Engine and Node.js.
Source: Canvas: Cloud Application Development Fall 2021: Exploration - Intermediate REST API Features with Node.js.
URL: https://canvas.oregonstate.edu/courses/1830399/pages/exploration-intermediate-rest-api-features-with-node-dot-js?module_item_id=21611081

My code in this file is based on some of the code in the 
server.js file provided in our class exploration, Exploration - Google App Engine and Node.js.
Source: Canvas: Cloud Application Development Fall 2021: Exploration - Google App Engine and Node.js.
URL: https://canvas.oregonstate.edu/courses/1830399/pages/exploration-google-app-engine-and-node-dot-js?module_item_id=21597884

*/


app.use(function(err, req, res, next){
  console.error(err.stack);
})

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});