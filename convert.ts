import * as fs from 'fs';
import csvParser from 'csv-parser';
import path from 'path';
import EleventyFetch from '@11ty/eleventy-fetch';

interface PostalAddress {
  "@type": "PostalAddress";
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: {
    "@type": "Country";
    name: string;
  }
}

interface SportsOrganization {
  "@context": string;
  "@type": string;
  name: string;
  address: PostalAddress;
}

interface PostcodesIO {
  result: {
    admin_county: string;
  }
}

const counties = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), './postcodes-io/counties.json'), 'utf-8'));

const organizations: SportsOrganization[] = [];

async function queryPostcode(postalCode: string): Promise<string | null> {
  if (!postalCode) {
    return null;
  }

  const encodedPostalCode = encodeURIComponent(postalCode);
  const url = `https://api.postcodes.io/postcodes/${encodedPostalCode}`;
  try {
    return await EleventyFetch(url, {
      duration: "1d", // save for 1 day
      type: "json"    // we’ll parse JSON for you
    });
  } catch (error) {
    console.error(`Error fetching data for postcode ${postalCode}:`, error);
    return null;
  }
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

async function processData(data: any): Promise<SportsOrganization> {
  const organizationName = data['Organisation Name'].trim();
  let addressLines = [data['Address Line 1'], data['Address Line 2'], data['Address Line 3'], data['Address Line 4']].filter(Boolean);

  if (addressLines.length > 0 && addressLines[0].trim() === organizationName) {
    addressLines.shift();
  }

  let addressRegion = '';
  let addressLocality = '';
  let previousLine = '';
  for (let line of addressLines) {
    const matchedCounty = Object.entries(counties).find(([code, county]) => county.toLowerCase() === line.trim().toLowerCase());
    if (matchedCounty) {
      addressRegion = matchedCounty[1];
      addressLocality = previousLine;
      addressLines = addressLines.filter(addressLine =>
        addressLine.trim().toLowerCase() !== matchedCounty[1].toLowerCase() &&
        addressLine.trim().toLowerCase() !== previousLine.trim().toLowerCase()
      );
      break;
    }
    previousLine = line;
  }

  if (!addressRegion) {
    addressLocality = addressLines.slice().reverse().find(line => line.trim() !== '');
    if (addressLocality) {
      addressLines = addressLines.filter(addressLine => addressLine.trim().toLowerCase() !== addressLocality.toLowerCase());
    }
  }

  if (data["Postcode"]) {
    const response: PostcodesIO = await queryPostcode(data['Postcode']);
    if (response && response.result) {
      addressRegion = response.result.admin_county ?? addressRegion;
    }
  }

  const address: PostalAddress = {
    "@type": "PostalAddress",
    streetAddress: toTitleCase(addressLines.join(', ')),
    addressLocality: addressLocality ? toTitleCase(addressLocality) : undefined,
    addressRegion: addressRegion ? toTitleCase(addressRegion) : undefined,
    postalCode: data['Postcode'] ? data['Postcode'] : undefined,
    addressCountry: {
      "@type": "Country",
      name: "GB"
    }
  };

  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: organizationName,
    address
  };
}

const processFile = async () => {
  return new Promise<void>((resolve, reject) => {
    let promises = [];
    let counter = 0;
    fs.createReadStream('registered-casc.csv')
      .pipe(csvParser())
      .on('data', (data: any) => {
        // Push the promise returned by processData into the promises array
        if (counter < 8192) {
          promises.push(processData(data).then(organization => {
            organizations.push(organization);
          }).catch(error => {
            console.error('Error processing CSV data:', error);
            reject(error);
          }));
          counter++;
        }
      })
      .on('end', async () => {
        // Wait for all promises to resolve before writing to the file
        await Promise.all(promises);
        fs.writeFileSync('registered-casc.json', JSON.stringify(organizations, null, 2));
        console.log('Conversion complete.');
        resolve();
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

processFile().catch(error => console.error('Error processing file:', error));


