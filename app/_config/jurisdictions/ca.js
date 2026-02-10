// Path: /app/_config/jurisdictions/ca.js

export const CA_JURISDICTION = {
  state: "CA",
  label: "California",
  counties: [
    // Bay Area / NorCal focus first
    {
      county: "San Mateo",
      courts: [
        {
          courtId: "san-mateo-southern",
          name: "Hall of Justice & Records (Southern Branch)",
          address: "400 County Center, 1st Floor, Room A, Redwood City, CA 94063",
          clerkUrl: "https://sanmateo.courts.ca.gov/divisions/small-claims-division"
        }
      ]
    },
    {
      county: "Santa Clara",
      courts: [
        {
          courtId: "santa-clara-dts",
          name: "Downtown Superior Court (DTS)",
          address: "191 North First Street, San Jose, CA 95113",
          clerkUrl: "https://santaclara.courts.ca.gov/location/downtown-superior-court-dts"
        }
      ]
    },
    {
      county: "Alameda",
      courts: [
        {
          courtId: "alameda-hayward",
          name: "Hayward Hall of Justice",
          address: "24405 Amador Street, Hayward, CA 94544",
          clerkUrl: "https://www.alameda.courts.ca.gov/location/hayward-hall-justice"
        }
      ]
    },
    {
      county: "Marin",
      courts: [
        {
          courtId: "marin-civic-center",
          name: "Marin County Civic Center",
          address: "3501 Civic Center Drive, Room 113, San Rafael, CA 94903",
          clerkUrl: "https://www.marincourt.org/courts/small-claims"
        }
      ]
    },
    {
      county: "San Francisco",
      courts: [
        {
          courtId: "sf-civic-center",
          name: "Civic Center Courthouse (Small Claims Division)",
          address: "400 McAllister St., Room 103, San Francisco, CA 94102-4514",
          clerkUrl: "https://sf.courts.ca.gov/divisions/small-claims"
        }
      ]
    },
    {
      county: "Santa Cruz",
      courts: [
        {
          courtId: "santa-cruz-watsonville",
          name: "Watsonville Courthouse",
          address: "1 Second Street, Room 300, Watsonville, CA 95076",
          clerkUrl: "https://www.santacruzcourt.org/divisions/small_claims"
        }
      ]
    },
    {
      county: "Monterey",
      courts: [
        {
          courtId: "monterey-filing",
          name: "Monterey Courthouse (Filing Location)",
          address: "1200 Aguajito Rd, Monterey, CA 93940",
          clerkUrl: "https://www.monterey.courts.ca.gov/divisions/small-claims",
          notes: "Per court: filings at Monterey Courthouse; hearings are held at Marina Courthouse."
        }
      ]
    },

    // Surrounding Bay Area counties (useful next)
    {
      county: "Contra Costa",
      courts: [
        {
          courtId: "contra-costa-martinez",
          name: "Wakefield Taylor Courthouse (Martinez)",
          address: "725 Court Street, Martinez, CA 94553",
          clerkUrl: "https://contracosta.courts.ca.gov/divisions/small-claims",
          notes: "Contra Costa small claims are heard in Martinez, Pittsburg, and Richmond; this is the Martinez listing."
        }
      ]
    },
    {
      county: "Sonoma",
      courts: [
        {
          courtId: "sonoma-civil-family",
          name: "Civil & Family Law Courthouse",
          address: "3055 Cleveland Ave., Santa Rosa, CA 95403",
          clerkUrl: "https://sonoma.courts.ca.gov/divisions/small-claims"
        }
      ]
    },
    {
      county: "Napa",
      courts: [
        {
          courtId: "napa-historic",
          name: "Historic Courthouse",
          address: "825 Brown Street, First Floor, Napa, CA 94559",
          clerkUrl: "https://www.napa.courts.ca.gov/divisions/small-claims"
        }
      ]
    },
    {
      county: "Solano",
      courts: [
        {
          courtId: "solano-filing",
          name: "Old Solano Courthouse (Filing / Clerk Services)",
          address: "580 Texas St, Fairfield, CA 94533",
          clerkUrl: "https://solano.courts.ca.gov/divisions/small-claims",
          notes: "Solano’s small claims pages distinguish filing/clerk services at 580 Texas St vs calendars at 600 Union Ave."
        }
      ]
    },

    // LA area (keep it present even while we focus NorCal)
    {
      county: "Los Angeles",
      courts: [
        {
          courtId: "la-stanley-mosk",
          name: "Stanley Mosk Courthouse (Central District)",
          address: "111 N Hill St, Los Angeles, CA 90012",
          clerkUrl: "https://www.lacourt.org/division/smallclaims/smallclaims.aspx"
        }
      ]
    }
  ]
};

