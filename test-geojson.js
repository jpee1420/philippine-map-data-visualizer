const fs = require('fs');

// Read ADM1 (regions)
const adm1 = JSON.parse(fs.readFileSync('public/data/geoBoundaries-PHL-ADM1_simplified.geojson', 'utf8'));
console.log('ADM1 (Regions) - First feature properties:');
console.log(JSON.stringify(adm1.features[0].properties, null, 2));
console.log('\nTotal features:', adm1.features.length);

// Read ADM2 (provinces)
const adm2 = JSON.parse(fs.readFileSync('public/data/geoBoundaries-PHL-ADM2_simplified.geojson', 'utf8'));
console.log('\n\nADM2 (Provinces) - First feature properties:');
console.log(JSON.stringify(adm2.features[0].properties, null, 2));
console.log('\nTotal features:', adm2.features.length);

// Read ADM3 (cities)
const adm3 = JSON.parse(fs.readFileSync('public/data/geoBoundaries-PHL-ADM3_simplified.geojson', 'utf8'));
console.log('\n\nADM3 (Cities) - First feature properties:');
console.log(JSON.stringify(adm3.features[0].properties, null, 2));
console.log('\nTotal features:', adm3.features.length);
