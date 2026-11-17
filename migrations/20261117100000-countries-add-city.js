"use strict";

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/*
 * Cities for India and the United States.
 *
 * Existing rows stay as they are (country + state, city NULL) and still mean
 * "the whole state". Each city is a new row under its state, so a photo's
 * country_id can point at either a state or a specific city, and everything
 * that reads `state` (the site's Location filter) keeps working unchanged.
 *
 * State names here must match the existing rows exactly. For India the list
 * also has the towns at the main national parks, since that's where most of
 * the photographs are taken.
 */
var CITIES = {
  India: {
    "Andaman and Nicobar": ["Port Blair", "Swaraj Dweep (Havelock)", "Shaheed Dweep (Neil)", "Diglipur", "Mayabunder", "Car Nicobar"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Anantapur", "Amaravati"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Ziro", "Pasighat", "Bomdila", "Dirang", "Roing", "Miao"],
    "Assam": ["Guwahati", "Dibrugarh", "Jorhat", "Silchar", "Tezpur", "Tinsukia", "Kohora (Kaziranga)", "Barpeta Road (Manas)"],
    "Bihar": ["Patna", "Gaya", "Bodh Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Rajgir", "Bettiah"],
    "Chandigarh": ["Chandigarh"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Bhilai", "Jagdalpur", "Korba", "Ambikapur", "Raigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    "Delhi": ["New Delhi", "Delhi"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Sasan Gir", "Bhuj", "Gandhinagar", "Dwarka"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak", "Sultanpur"],
    "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala", "Kullu", "Kaza (Spiti)", "Dalhousie", "Mandi", "Palampur", "Kalpa"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Gulmarg", "Pahalgam", "Sonamarg", "Anantnag", "Baramulla", "Udhampur"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar", "Latehar (Betla)"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Hampi", "Madikeri", "Chikkamagaluru", "Udupi", "Dandeli", "Bandipur", "HD Kote (Kabini)"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Munnar", "Thekkady", "Alappuzha", "Kalpetta (Wayanad)", "Kollam", "Kannur"],
    "Ladakh": ["Leh", "Kargil", "Hanle", "Diskit (Nubra)", "Hemis"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Khajuraho", "Tala (Bandhavgarh)", "Mandla (Kanha)", "Seoni (Pench)", "Panna", "Pachmarhi", "Satna"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Chhatrapati Sambhajinagar", "Kolhapur", "Thane", "Chandrapur (Tadoba)", "Lonavala", "Mahabaleshwar", "Ratnagiri"],
    "Manipur": ["Imphal", "Moirang", "Churachandpur", "Ukhrul"],
    "Meghalaya": ["Shillong", "Sohra (Cherrapunji)", "Tura", "Jowai", "Mawlynnong"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Khonoma"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Puri", "Konark", "Rourkela", "Berhampur", "Sambalpur", "Satapada (Chilika)", "Rajnagar (Bhitarkanika)"],
    "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
    "Punjab": ["Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Harike"],
    "Rajasthan": ["Jaipur", "Udaipur", "Jodhpur", "Jaisalmer", "Bikaner", "Ajmer", "Pushkar", "Kota", "Sawai Madhopur (Ranthambore)", "Bharatpur", "Mount Abu", "Alwar (Sariska)", "Chittorgarh", "Chhapar"],
    "Sikkim": ["Gangtok", "Pelling", "Lachung", "Namchi", "Ravangla"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Ooty", "Kodaikanal", "Valparai", "Masinagudi (Mudumalai)", "Kanyakumari", "Rameswaram", "Thanjavur", "Vellore", "Kodiakkarai (Point Calimere)"],
    "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"],
    "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
    "Uttar Pradesh": ["Lucknow", "Agra", "Varanasi", "Kanpur", "Prayagraj", "Noida", "Ghaziabad", "Mathura", "Ayodhya", "Gorakhpur", "Palia Kalan (Dudhwa)"],
    "Uttarakhand": ["Dehradun", "Rishikesh", "Haridwar", "Nainital", "Mussoorie", "Ramnagar (Corbett)", "Chopta", "Almora", "Munsiyari", "Joshimath"],
    "West Bengal": ["Kolkata", "Darjeeling", "Siliguri", "Kalimpong", "Durgapur", "Asansol", "Gosaba (Sundarbans)", "Madarihat (Jaldapara)", "Lataguri (Gorumara)"],
  },
  "United States": {
    "Alabama": ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa"],
    "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Homer", "Seward", "Kodiak", "Healy (Denali)"],
    "Arizona": ["Phoenix", "Tucson", "Flagstaff", "Sedona", "Scottsdale", "Page", "Grand Canyon Village"],
    "Arkansas": ["Little Rock", "Fayetteville", "Fort Smith", "Hot Springs"],
    "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento", "Fresno", "Oakland", "Monterey", "Santa Barbara", "Yosemite Valley", "Big Sur"],
    "Colorado": ["Denver", "Colorado Springs", "Boulder", "Fort Collins", "Aspen", "Estes Park", "Durango"],
    "Connecticut": ["Hartford", "New Haven", "Stamford", "Bridgeport"],
    "Delaware": ["Wilmington", "Dover", "Newark", "Lewes"],
    "District of Columbia": ["Washington"],
    "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "Tallahassee", "St. Petersburg", "Key West", "Naples", "Fort Myers", "Everglades City"],
    "Georgia": ["Atlanta", "Savannah", "Augusta", "Athens", "Macon"],
    "Hawaii": ["Honolulu", "Hilo", "Kailua-Kona", "Lahaina", "Lihue", "Kahului"],
    "Idaho": ["Boise", "Idaho Falls", "Coeur d'Alene", "Pocatello", "Sun Valley"],
    "Illinois": ["Chicago", "Springfield", "Peoria", "Naperville", "Rockford"],
    "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "Bloomington", "South Bend"],
    "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Iowa City"],
    "Kansas": ["Wichita", "Topeka", "Kansas City", "Lawrence"],
    "Kentucky": ["Louisville", "Lexington", "Frankfort", "Bowling Green"],
    "Louisiana": ["New Orleans", "Baton Rouge", "Lafayette", "Shreveport"],
    "Maine": ["Portland", "Bangor", "Bar Harbor", "Augusta"],
    "Maryland": ["Baltimore", "Annapolis", "Frederick", "Ocean City"],
    "Massachusetts": ["Boston", "Cambridge", "Worcester", "Springfield", "Plymouth", "Provincetown"],
    "Michigan": ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing", "Traverse City", "Marquette"],
    "Minnesota": ["Minneapolis", "Saint Paul", "Duluth", "Rochester", "Ely"],
    "Mississippi": ["Jackson", "Gulfport", "Biloxi", "Oxford"],
    "Missouri": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Branson"],
    "Montana": ["Billings", "Missoula", "Bozeman", "Helena", "West Yellowstone", "Whitefish"],
    "Nebraska": ["Omaha", "Lincoln", "Kearney", "Grand Island"],
    "Nevada": ["Las Vegas", "Reno", "Carson City", "Henderson"],
    "New Hampshire": ["Manchester", "Concord", "Portsmouth", "Nashua"],
    "New Jersey": ["Newark", "Jersey City", "Atlantic City", "Trenton", "Cape May"],
    "New Mexico": ["Albuquerque", "Santa Fe", "Las Cruces", "Taos", "Socorro"],
    "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse", "Ithaca", "Lake Placid"],
    "North Carolina": ["Charlotte", "Raleigh", "Durham", "Greensboro", "Asheville", "Wilmington", "Nags Head"],
    "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Medora"],
    "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Dayton"],
    "Oklahoma": ["Oklahoma City", "Tulsa", "Norman"],
    "Oregon": ["Portland", "Eugene", "Salem", "Bend", "Astoria"],
    "Pennsylvania": ["Philadelphia", "Pittsburgh", "Harrisburg", "Allentown", "Erie"],
    "Rhode Island": ["Providence", "Newport", "Warwick"],
    "South Carolina": ["Charleston", "Columbia", "Greenville", "Myrtle Beach"],
    "South Dakota": ["Sioux Falls", "Rapid City", "Pierre", "Custer"],
    "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Gatlinburg"],
    "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth", "El Paso", "Corpus Christi", "South Padre Island", "Terlingua"],
    "Utah": ["Salt Lake City", "Provo", "Park City", "Moab", "St. George", "Springdale"],
    "Vermont": ["Burlington", "Montpelier", "Stowe"],
    "Virginia": ["Richmond", "Virginia Beach", "Norfolk", "Alexandria", "Charlottesville", "Chincoteague"],
    "Washington": ["Seattle", "Spokane", "Tacoma", "Olympia", "Bellingham", "Port Angeles", "Friday Harbor"],
    "West Virginia": ["Charleston", "Morgantown", "Huntington", "Fayetteville"],
    "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Eau Claire"],
    "Wyoming": ["Cheyenne", "Jackson", "Cody", "Casper", "Laramie"],
  },
};

function cityRows() {
  var rows = [];
  Object.keys(CITIES).forEach(function (country) {
    Object.keys(CITIES[country]).forEach(function (state) {
      CITIES[country][state].forEach(function (city) {
        rows.push([country, state, city]);
      });
    });
  });
  return rows;
}

exports.up = function (db) {
  return db
    .runSql(`
      ALTER TABLE countries
      ADD COLUMN city VARCHAR(255) NULL AFTER state,
      DROP INDEX country,
      ADD UNIQUE KEY country (country, state, city)
    `)
    .then(function () {
      var rows = cityRows();
      var params = [].concat.apply([], rows);
      // Only states that already exist get cities (a typo here would
      // otherwise create a stray country/state).
      return db.runSql(
        `INSERT IGNORE INTO countries (country, state, city)
         SELECT v.country, v.state, v.city
         FROM (SELECT ? AS country, ? AS state, ? AS city` +
          rows.slice(1).map(function () { return " UNION ALL SELECT ?, ?, ?"; }).join("") +
          `) v
         WHERE EXISTS (
           SELECT 1 FROM countries s
           WHERE s.country = v.country AND s.state = v.state AND s.city IS NULL
         )`,
        params
      );
    });
};

exports.down = function (db) {
  // Photos and bulk-upload drafts that point at a city fall back to its state.
  return db
    .runSql(`
      UPDATE photos p
      JOIN countries c ON c.id = p.country_id AND c.city IS NOT NULL
      JOIN countries s ON s.country = c.country AND s.state = c.state AND s.city IS NULL
      SET p.country_id = s.id
    `)
    .then(function () {
      return db.runSql(`
        UPDATE bulk_upload_drafts d
        JOIN countries c ON c.id = d.country_id AND c.city IS NOT NULL
        JOIN countries s ON s.country = c.country AND s.state = c.state AND s.city IS NULL
        SET d.country_id = s.id
      `);
    })
    .then(function () {
      return db.runSql(`DELETE FROM countries WHERE city IS NOT NULL`);
    })
    .then(function () {
      return db.runSql(`
        ALTER TABLE countries
        DROP INDEX country,
        DROP COLUMN city,
        ADD UNIQUE KEY country (country, state)
      `);
    });
};

exports._meta = {
  version: 1,
};
