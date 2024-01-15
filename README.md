# registered-casc

Generate a schema.org compliant JSON file of Registered [Community Amateur
Sports Clubs](https://www.gov.uk/register-a-community-amateur-sports-club) in
the UK.

## Current version

This JSON is based on the 13 October 2023 file.

## History

HMRC publish a list of all registered CASCs in the UK. This is an ODS file that
is updated infrequently. This project aims to convert that file into a JSON file
that is schema.org compliant.

### Sample entry

```csv
ABBOTS LANGLEY BOWLING CLUB   ,12 GREENWAYS,ABBOTS LANGLEY,,,WD5 0EU
```

```json
{
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  "name": "ABBOTS LANGLEY BOWLING CLUB",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "12 Greenways",
    "addressLocality": "Abbots Langley",
    "addressRegion": "Hertfordshire",
    "postalCode": "WD5 0EU",
    "addressCountry": {
      "@type": "Country",
      "name": "GB"
    }
  }
}
```

### Process

The ODS file is converted to a CSV file using LibreOffice. The CSV file is then
converted to a JSON file using a TypeScript script.

If there's no county `aaddressRegion`, then a call is made to `api.postcodes.io` to see if there's an associated `admin_county` for the postcode.

## Usage

`bun convert.ts`

```

```
