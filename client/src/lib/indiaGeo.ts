/**
 * India Geographic & Logistics Data Module
 * Provides Indian States, City-to-State resolution, and PIN Code routing for Delhivery fulfillment.
 */

export const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

/** Popular / primary cities per state for quick selection */
export const STATE_TO_CITIES: Record<string, string[]> = {
  'Uttar Pradesh': [
    'Agra',
    'Lucknow',
    'Noida',
    'Greater Noida',
    'Ghaziabad',
    'Kanpur',
    'Varanasi',
    'Prayagraj',
    'Meerut',
    'Bareilly',
    'Aligarh',
    'Moradabad',
    'Gorakhpur',
    'Mathura',
    'Jhansi',
    'Ayodhya',
  ],
  'Maharashtra': [
    'Mumbai',
    'Pune',
    'Nagpur',
    'Thane',
    'Nashik',
    'Navi Mumbai',
    'Chhatrapati Sambhajinagar',
    'Solapur',
    'Kolhapur',
    'Amravati',
  ],
  'Karnataka': [
    'Bengaluru',
    'Mysuru',
    'Mangaluru',
    'Hubballi-Dharwad',
    'Belagavi',
    'Kalaburagi',
    'Davanagere',
    'Ballari',
    'Shivamogga',
    'Udupi',
  ],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode'],
  'Telangana': ['Hyderabad', 'Secunderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Kakinada', 'Rajahmundry'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Kharagpur'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Ratlam', 'Rewa'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  'Chandigarh': ['Chandigarh'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Bihar Sharif'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Puri', 'Sambalpur', 'Balasore'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Haldwani', 'Roorkee', 'Nainital'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Mandi', 'Kullu'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Puducherry': ['Puducherry', 'Karaikal'],
};

/** Normalized city name to State lookup table */
export const CITY_TO_STATE: Record<string, string> = {
  // Uttar Pradesh
  'agra': 'Uttar Pradesh',
  'lucknow': 'Uttar Pradesh',
  'noida': 'Uttar Pradesh',
  'greater noida': 'Uttar Pradesh',
  'ghaziabad': 'Uttar Pradesh',
  'kanpur': 'Uttar Pradesh',
  'varanasi': 'Uttar Pradesh',
  'banaras': 'Uttar Pradesh',
  'kashi': 'Uttar Pradesh',
  'prayagraj': 'Uttar Pradesh',
  'allahabad': 'Uttar Pradesh',
  'meerut': 'Uttar Pradesh',
  'bareilly': 'Uttar Pradesh',
  'aligarh': 'Uttar Pradesh',
  'moradabad': 'Uttar Pradesh',
  'saharanpur': 'Uttar Pradesh',
  'gorakhpur': 'Uttar Pradesh',
  'mathura': 'Uttar Pradesh',
  'firozabad': 'Uttar Pradesh',
  'jhansi': 'Uttar Pradesh',
  'muzaffarnagar': 'Uttar Pradesh',
  'ayodhya': 'Uttar Pradesh',
  'faizabad': 'Uttar Pradesh',

  // Maharashtra
  'mumbai': 'Maharashtra',
  'bombay': 'Maharashtra',
  'pune': 'Maharashtra',
  'nagpur': 'Maharashtra',
  'thane': 'Maharashtra',
  'nashik': 'Maharashtra',
  'nasik': 'Maharashtra',
  'navi mumbai': 'Maharashtra',
  'aurangabad': 'Maharashtra',
  'chhatrapati sambhajinagar': 'Maharashtra',
  'solapur': 'Maharashtra',
  'kolhapur': 'Maharashtra',
  'amravati': 'Maharashtra',
  'nanded': 'Maharashtra',
  'jalgaon': 'Maharashtra',
  'akola': 'Maharashtra',

  // Karnataka
  'bengaluru': 'Karnataka',
  'bangalore': 'Karnataka',
  'mysuru': 'Karnataka',
  'mysore': 'Karnataka',
  'mangaluru': 'Karnataka',
  'mangalore': 'Karnataka',
  'hubballi': 'Karnataka',
  'hubballi-dharwad': 'Karnataka',
  'hubli': 'Karnataka',
  'dharwad': 'Karnataka',
  'belagavi': 'Karnataka',
  'belgaum': 'Karnataka',
  'kalaburagi': 'Karnataka',
  'gulbarga': 'Karnataka',
  'davanagere': 'Karnataka',
  'davangere': 'Karnataka',
  'ballari': 'Karnataka',
  'bellary': 'Karnataka',
  'shivamogga': 'Karnataka',
  'shimoga': 'Karnataka',
  'udupi': 'Karnataka',

  // Delhi NCR
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'central delhi': 'Delhi',
  'north delhi': 'Delhi',
  'south delhi': 'Delhi',
  'east delhi': 'Delhi',
  'west delhi': 'Delhi',

  // Haryana
  'gurugram': 'Haryana',
  'gurgaon': 'Haryana',
  'faridabad': 'Haryana',
  'panipat': 'Haryana',
  'ambala': 'Haryana',
  'rohtak': 'Haryana',
  'hisar': 'Haryana',
  'karnal': 'Haryana',
  'sonipat': 'Haryana',
  'panchkula': 'Haryana',

  // Rajasthan
  'jaipur': 'Rajasthan',
  'jodhpur': 'Rajasthan',
  'udaipur': 'Rajasthan',
  'kota': 'Rajasthan',
  'bikaner': 'Rajasthan',
  'ajmer': 'Rajasthan',
  'bhilwara': 'Rajasthan',
  'alwar': 'Rajasthan',
  'sikar': 'Rajasthan',

  // Gujarat
  'ahmedabad': 'Gujarat',
  'surat': 'Gujarat',
  'vadodara': 'Gujarat',
  'baroda': 'Gujarat',
  'rajkot': 'Gujarat',
  'bhavnagar': 'Gujarat',
  'jamnagar': 'Gujarat',
  'gandhinagar': 'Gujarat',
  'junagadh': 'Gujarat',
  'anand': 'Gujarat',

  // Tamil Nadu
  'chennai': 'Tamil Nadu',
  'madras': 'Tamil Nadu',
  'coimbatore': 'Tamil Nadu',
  'madurai': 'Tamil Nadu',
  'tiruchirappalli': 'Tamil Nadu',
  'trichy': 'Tamil Nadu',
  'salem': 'Tamil Nadu',
  'tirunelveli': 'Tamil Nadu',
  'tiruppur': 'Tamil Nadu',
  'vellore': 'Tamil Nadu',
  'erode': 'Tamil Nadu',

  // Telangana
  'hyderabad': 'Telangana',
  'secunderabad': 'Telangana',
  'warangal': 'Telangana',
  'nizamabad': 'Telangana',
  'karimnagar': 'Telangana',
  'khammam': 'Telangana',

  // Andhra Pradesh
  'visakhapatnam': 'Andhra Pradesh',
  'vizag': 'Andhra Pradesh',
  'vijayawada': 'Andhra Pradesh',
  'guntur': 'Andhra Pradesh',
  'nellore': 'Andhra Pradesh',
  'kurnool': 'Andhra Pradesh',
  'tirupati': 'Andhra Pradesh',
  'kakinada': 'Andhra Pradesh',
  'rajahmundry': 'Andhra Pradesh',

  // West Bengal
  'kolkata': 'West Bengal',
  'calcutta': 'West Bengal',
  'howrah': 'West Bengal',
  'durgapur': 'West Bengal',
  'asansol': 'West Bengal',
  'siliguri': 'West Bengal',
  'bardhaman': 'West Bengal',
  'kharagpur': 'West Bengal',

  // Kerala
  'kochi': 'Kerala',
  'cochin': 'Kerala',
  'thiruvananthapuram': 'Kerala',
  'trivandrum': 'Kerala',
  'kozhikode': 'Kerala',
  'calicut': 'Kerala',
  'thrissur': 'Kerala',
  'kollam': 'Kerala',
  'kannur': 'Kerala',
  'alappuzha': 'Kerala',
  'palakkad': 'Kerala',

  // Madhya Pradesh
  'indore': 'Madhya Pradesh',
  'bhopal': 'Madhya Pradesh',
  'gwalior': 'Madhya Pradesh',
  'jabalpur': 'Madhya Pradesh',
  'ujjain': 'Madhya Pradesh',
  'sagar': 'Madhya Pradesh',
  'ratlam': 'Madhya Pradesh',
  'rewa': 'Madhya Pradesh',

  // Punjab
  'amritsar': 'Punjab',
  'ludhiana': 'Punjab',
  'jalandhar': 'Punjab',
  'patiala': 'Punjab',
  'bathinda': 'Punjab',
  'mohali': 'Punjab',

  // Chandigarh
  'chandigarh': 'Chandigarh',

  // Bihar
  'patna': 'Bihar',
  'gaya': 'Bihar',
  'bhagalpur': 'Bihar',
  'muzaffarpur': 'Bihar',
  'darbhanga': 'Bihar',
  'purnia': 'Bihar',

  // Jharkhand
  'ranchi': 'Jharkhand',
  'jamshedpur': 'Jharkhand',
  'dhanbad': 'Jharkhand',
  'bokaro': 'Jharkhand',
  'deoghar': 'Jharkhand',

  // Odisha
  'bhubaneswar': 'Odisha',
  'cuttack': 'Odisha',
  'rourkela': 'Odisha',
  'puri': 'Odisha',
  'sambalpur': 'Odisha',

  // Uttarakhand
  'dehradun': 'Uttarakhand',
  'haridwar': 'Uttarakhand',
  'rishikesh': 'Uttarakhand',
  'haldwani': 'Uttarakhand',
  'roorkee': 'Uttarakhand',
  'nainital': 'Uttarakhand',

  // Goa
  'panaji': 'Goa',
  'panjim': 'Goa',
  'margao': 'Goa',
  'vasco da gama': 'Goa',
  'mapusa': 'Goa',

  // Assam & North East
  'guwahati': 'Assam',
  'silchar': 'Assam',
  'dibrugarh': 'Assam',
  'jorhat': 'Assam',
  'shillong': 'Meghalaya',
  'imphal': 'Manipur',
  'agartala': 'Tripura',
  'aizawl': 'Mizoram',
  'kohima': 'Nagaland',
  'dimapur': 'Nagaland',
  'gangtok': 'Sikkim',
  'itanagar': 'Arunachal Pradesh',

  // Chhattisgarh
  'raipur': 'Chhattisgarh',
  'bhilai': 'Chhattisgarh',
  'bilaspur': 'Chhattisgarh',
  'korba': 'Chhattisgarh',

  // Himachal Pradesh
  'shimla': 'Himachal Pradesh',
  'dharamshala': 'Himachal Pradesh',
  'manali': 'Himachal Pradesh',
  'solan': 'Himachal Pradesh',
  'mandi': 'Himachal Pradesh',
  'kullu': 'Himachal Pradesh',

  // Jammu & Kashmir and Ladakh
  'srinagar': 'Jammu and Kashmir',
  'jammu': 'Jammu and Kashmir',
  'leh': 'Ladakh',
  'kargil': 'Ladakh',

  // Puducherry
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry',
};

/** Specific major PIN code prefix overrides for high precision */
const PIN_PREFIX_MAP: Array<{ prefix: string; city: string; state: string }> = [
  // Local Agra
  { prefix: '282', city: 'Agra', state: 'Uttar Pradesh' },
  { prefix: '283', city: 'Firozabad', state: 'Uttar Pradesh' },
  { prefix: '281', city: 'Mathura', state: 'Uttar Pradesh' },
  { prefix: '284', city: 'Jhansi', state: 'Uttar Pradesh' },
  { prefix: '226', city: 'Lucknow', state: 'Uttar Pradesh' },
  { prefix: '208', city: 'Kanpur', state: 'Uttar Pradesh' },
  { prefix: '221', city: 'Varanasi', state: 'Uttar Pradesh' },
  { prefix: '211', city: 'Prayagraj', state: 'Uttar Pradesh' },
  { prefix: '2013', city: 'Noida', state: 'Uttar Pradesh' },
  { prefix: '2010', city: 'Ghaziabad', state: 'Uttar Pradesh' },
  { prefix: '250', city: 'Meerut', state: 'Uttar Pradesh' },
  { prefix: '243', city: 'Bareilly', state: 'Uttar Pradesh' },
  { prefix: '202', city: 'Aligarh', state: 'Uttar Pradesh' },
  { prefix: '273', city: 'Gorakhpur', state: 'Uttar Pradesh' },
  { prefix: '224', city: 'Ayodhya', state: 'Uttar Pradesh' },

  // Delhi NCR
  { prefix: '11', city: 'New Delhi', state: 'Delhi' },
  { prefix: '122', city: 'Gurugram', state: 'Haryana' },
  { prefix: '121', city: 'Faridabad', state: 'Haryana' },
  { prefix: '132', city: 'Panipat', state: 'Haryana' },
  { prefix: '133', city: 'Ambala', state: 'Haryana' },
  { prefix: '134', city: 'Panchkula', state: 'Haryana' },

  // Maharashtra
  { prefix: '400', city: 'Mumbai', state: 'Maharashtra' },
  { prefix: '401', city: 'Thane', state: 'Maharashtra' },
  { prefix: '411', city: 'Pune', state: 'Maharashtra' },
  { prefix: '440', city: 'Nagpur', state: 'Maharashtra' },
  { prefix: '422', city: 'Nashik', state: 'Maharashtra' },
  { prefix: '431', city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra' },
  { prefix: '416', city: 'Kolhapur', state: 'Maharashtra' },
  { prefix: '413', city: 'Solapur', state: 'Maharashtra' },

  // Karnataka
  { prefix: '560', city: 'Bengaluru', state: 'Karnataka' },
  { prefix: '562', city: 'Bengaluru Rural', state: 'Karnataka' },
  { prefix: '570', city: 'Mysuru', state: 'Karnataka' },
  { prefix: '575', city: 'Mangaluru', state: 'Karnataka' },
  { prefix: '580', city: 'Hubballi', state: 'Karnataka' },
  { prefix: '590', city: 'Belagavi', state: 'Karnataka' },
  { prefix: '577', city: 'Shivamogga', state: 'Karnataka' },
  { prefix: '576', city: 'Udupi', state: 'Karnataka' },

  // Tamil Nadu
  { prefix: '600', city: 'Chennai', state: 'Tamil Nadu' },
  { prefix: '641', city: 'Coimbatore', state: 'Tamil Nadu' },
  { prefix: '625', city: 'Madurai', state: 'Tamil Nadu' },
  { prefix: '620', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
  { prefix: '636', city: 'Salem', state: 'Tamil Nadu' },
  { prefix: '6416', city: 'Tiruppur', state: 'Tamil Nadu' },
  { prefix: '627', city: 'Tirunelveli', state: 'Tamil Nadu' },
  { prefix: '632', city: 'Vellore', state: 'Tamil Nadu' },

  // Telangana & Andhra Pradesh
  { prefix: '500', city: 'Hyderabad', state: 'Telangana' },
  { prefix: '501', city: 'Ranga Reddy', state: 'Telangana' },
  { prefix: '506', city: 'Warangal', state: 'Telangana' },
  { prefix: '530', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { prefix: '520', city: 'Vijayawada', state: 'Andhra Pradesh' },
  { prefix: '522', city: 'Guntur', state: 'Andhra Pradesh' },
  { prefix: '517', city: 'Tirupati', state: 'Andhra Pradesh' },
  { prefix: '518', city: 'Kurnool', state: 'Andhra Pradesh' },

  // Gujarat
  { prefix: '380', city: 'Ahmedabad', state: 'Gujarat' },
  { prefix: '395', city: 'Surat', state: 'Gujarat' },
  { prefix: '390', city: 'Vadodara', state: 'Gujarat' },
  { prefix: '360', city: 'Rajkot', state: 'Gujarat' },
  { prefix: '382', city: 'Gandhinagar', state: 'Gujarat' },
  { prefix: '364', city: 'Bhavnagar', state: 'Gujarat' },
  { prefix: '361', city: 'Jamnagar', state: 'Gujarat' },

  // Rajasthan
  { prefix: '302', city: 'Jaipur', state: 'Rajasthan' },
  { prefix: '342', city: 'Jodhpur', state: 'Rajasthan' },
  { prefix: '313', city: 'Udaipur', state: 'Rajasthan' },
  { prefix: '324', city: 'Kota', state: 'Rajasthan' },
  { prefix: '334', city: 'Bikaner', state: 'Rajasthan' },
  { prefix: '305', city: 'Ajmer', state: 'Rajasthan' },

  // West Bengal
  { prefix: '700', city: 'Kolkata', state: 'West Bengal' },
  { prefix: '711', city: 'Howrah', state: 'West Bengal' },
  { prefix: '713', city: 'Durgapur', state: 'West Bengal' },
  { prefix: '734', city: 'Siliguri', state: 'West Bengal' },
  { prefix: '721', city: 'Kharagpur', state: 'West Bengal' },

  // Kerala
  { prefix: '682', city: 'Kochi', state: 'Kerala' },
  { prefix: '695', city: 'Thiruvananthapuram', state: 'Kerala' },
  { prefix: '673', city: 'Kozhikode', state: 'Kerala' },
  { prefix: '680', city: 'Thrissur', state: 'Kerala' },
  { prefix: '691', city: 'Kollam', state: 'Kerala' },

  // Madhya Pradesh
  { prefix: '452', city: 'Indore', state: 'Madhya Pradesh' },
  { prefix: '462', city: 'Bhopal', state: 'Madhya Pradesh' },
  { prefix: '474', city: 'Gwalior', state: 'Madhya Pradesh' },
  { prefix: '482', city: 'Jabalpur', state: 'Madhya Pradesh' },
  { prefix: '456', city: 'Ujjain', state: 'Madhya Pradesh' },

  // Punjab & Chandigarh
  { prefix: '160', city: 'Chandigarh', state: 'Chandigarh' },
  { prefix: '141', city: 'Ludhiana', state: 'Punjab' },
  { prefix: '143', city: 'Amritsar', state: 'Punjab' },
  { prefix: '144', city: 'Jalandhar', state: 'Punjab' },
  { prefix: '147', city: 'Patiala', state: 'Punjab' },

  // Bihar & Jharkhand
  { prefix: '800', city: 'Patna', state: 'Bihar' },
  { prefix: '823', city: 'Gaya', state: 'Bihar' },
  { prefix: '834', city: 'Ranchi', state: 'Jharkhand' },
  { prefix: '831', city: 'Jamshedpur', state: 'Jharkhand' },
  { prefix: '826', city: 'Dhanbad', state: 'Jharkhand' },

  // Odisha
  { prefix: '751', city: 'Bhubaneswar', state: 'Odisha' },
  { prefix: '753', city: 'Cuttack', state: 'Odisha' },
  { prefix: '769', city: 'Rourkela', state: 'Odisha' },
  { prefix: '752', city: 'Puri', state: 'Odisha' },

  // Uttarakhand
  { prefix: '248', city: 'Dehradun', state: 'Uttarakhand' },
  { prefix: '2494', city: 'Haridwar', state: 'Uttarakhand' },
  { prefix: '2492', city: 'Rishikesh', state: 'Uttarakhand' },
  { prefix: '263', city: 'Haldwani', state: 'Uttarakhand' },

  // Goa
  { prefix: '403', city: 'Panaji', state: 'Goa' },

  // Assam & North East
  { prefix: '781', city: 'Guwahati', state: 'Assam' },
  { prefix: '793', city: 'Shillong', state: 'Meghalaya' },
  { prefix: '795', city: 'Imphal', state: 'Manipur' },
  { prefix: '799', city: 'Agartala', state: 'Tripura' },
  { prefix: '796', city: 'Aizawl', state: 'Mizoram' },
  { prefix: '797', city: 'Kohima', state: 'Nagaland' },
  { prefix: '737', city: 'Gangtok', state: 'Sikkim' },

  // Chhattisgarh
  { prefix: '492', city: 'Raipur', state: 'Chhattisgarh' },
  { prefix: '490', city: 'Bhilai', state: 'Chhattisgarh' },
  { prefix: '495', city: 'Bilaspur', state: 'Chhattisgarh' },

  // Himachal Pradesh
  { prefix: '171', city: 'Shimla', state: 'Himachal Pradesh' },
  { prefix: '176', city: 'Dharamshala', state: 'Himachal Pradesh' },
  { prefix: '175', city: 'Mandi', state: 'Himachal Pradesh' },

  // Jammu & Kashmir and Ladakh
  { prefix: '190', city: 'Srinagar', state: 'Jammu and Kashmir' },
  { prefix: '180', city: 'Jammu', state: 'Jammu and Kashmir' },
  { prefix: '194', city: 'Leh', state: 'Ladakh' },
];

/** Official 2-digit India Post circle prefix fallback to State */
const PIN_CIRCLE_TO_STATE: Record<string, string> = {
  '11': 'Delhi',
  '12': 'Haryana',
  '13': 'Haryana',
  '14': 'Punjab',
  '15': 'Punjab',
  '16': 'Chandigarh',
  '17': 'Himachal Pradesh',
  '18': 'Jammu and Kashmir',
  '19': 'Jammu and Kashmir',
  '20': 'Uttar Pradesh',
  '21': 'Uttar Pradesh',
  '22': 'Uttar Pradesh',
  '23': 'Uttar Pradesh',
  '24': 'Uttar Pradesh',
  '25': 'Uttar Pradesh',
  '26': 'Uttar Pradesh',
  '27': 'Uttar Pradesh',
  '28': 'Uttar Pradesh',
  '30': 'Rajasthan',
  '31': 'Rajasthan',
  '32': 'Rajasthan',
  '33': 'Rajasthan',
  '34': 'Rajasthan',
  '36': 'Gujarat',
  '37': 'Gujarat',
  '38': 'Gujarat',
  '39': 'Gujarat',
  '40': 'Maharashtra',
  '41': 'Maharashtra',
  '42': 'Maharashtra',
  '43': 'Maharashtra',
  '44': 'Maharashtra',
  '45': 'Madhya Pradesh',
  '46': 'Madhya Pradesh',
  '47': 'Madhya Pradesh',
  '48': 'Madhya Pradesh',
  '49': 'Chhattisgarh',
  '50': 'Telangana',
  '51': 'Andhra Pradesh',
  '52': 'Andhra Pradesh',
  '53': 'Andhra Pradesh',
  '56': 'Karnataka',
  '57': 'Karnataka',
  '58': 'Karnataka',
  '59': 'Karnataka',
  '60': 'Tamil Nadu',
  '61': 'Tamil Nadu',
  '62': 'Tamil Nadu',
  '63': 'Tamil Nadu',
  '64': 'Tamil Nadu',
  '67': 'Kerala',
  '68': 'Kerala',
  '69': 'Kerala',
  '70': 'West Bengal',
  '71': 'West Bengal',
  '72': 'West Bengal',
  '73': 'West Bengal',
  '74': 'West Bengal',
  '75': 'Odisha',
  '76': 'Odisha',
  '77': 'Odisha',
  '78': 'Assam',
  '79': 'North East India',
  '80': 'Bihar',
  '81': 'Bihar',
  '82': 'Bihar',
  '83': 'Jharkhand',
  '84': 'Bihar',
  '85': 'Bihar',
};

/**
 * Detects Indian State based on city name.
 * Returns state name if recognized, or undefined.
 */
export function getStateFromCity(city: string): string | undefined {
  if (!city) return undefined;
  const clean = city.trim().toLowerCase();
  return CITY_TO_STATE[clean];
}

/**
 * Detects City and State based on a 6-digit Indian PIN code.
 */
export function getCityAndStateFromPincode(pincode: string): { city: string; state: string } | null {
  const clean = pincode.trim().replace(/\D/g, '');
  if (clean.length !== 6 || clean[0] === '0') return null;

  // 1. Try longest prefix match first (e.g. 2013, 2494, 282)
  for (const item of PIN_PREFIX_MAP) {
    if (clean.startsWith(item.prefix)) {
      return { city: item.city, state: item.state };
    }
  }

  // 2. Fall back to 2-digit postal circle
  const circle = clean.slice(0, 2);
  const state = PIN_CIRCLE_TO_STATE[circle];
  if (state) {
    return {
      city: '', // User specifies exact local town/taluk
      state,
    };
  }

  return null;
}
