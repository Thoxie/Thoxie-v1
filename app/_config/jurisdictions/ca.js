// Path: /app/_config/jurisdictions/ca.js

/**
 * California Small Claims Jurisdiction Config
 * Config-driven. No court rules hard-coded elsewhere.
 *
 * IMPORTANT:
 * This module MUST default-export the object (export default),
 * because the app imports it as a default import.
 */

const CA_JURISDICTION = {
  state: "CA",
  stateName: "California",
  claimLimit: 10000,
  counties: [
    // ===== Bay Area / NorCal FIRST =====

    {
      county: "San Mateo",
      courts: [
        {
          courtId: "SM-SC-001",
          name: "Hall of Justice & Records (Southern Branch) — Small Claims",
          address: "400 County Center, Redwood City, CA 94063",
          clerkUrl: "https://sanmateo.courts.ca.gov/divisions/small-claims-division"
        }
      ]
    },

    {
      county: "Santa Clara",
      courts: [
        {
          courtId: "SC-SC-001",
          name: "Downtown Superior Court (DTS) — Small Claims",
          address: "191 North First Street, San Jose, CA 95113",
          clerkUrl: "https://santaclara.courts.ca.gov/location/downtown-superior-court-dts"
        }
      ]
    },

    {
      county: "Alameda",
      courts: [
        {
          courtId: "AL-SC-001",
          name: "Hayward Hall of Justice — Small Claims (Filing Location)",
          address: "24405 Amador Street, Hayward, CA 94544",
          clerkUrl: "https://www.alameda.courts.ca.gov/divisions/small-claims"
        }
      ]
    },

    {
      county: "Marin",
      courts: [
        {
          courtId: "MR-SC-001",
          name: "Civic Center, Hall of Justice — Small Claims",
          address: "3501 Civic Center Drive, Room 113, San Rafael, CA 94903",
          clerkUrl: "https://www.marin.courts.ca.gov/divisions/small-claims"
        }
      ]
    },

    {
      county: "San Francisco",
      courts: [
        {
          courtId: "SF-SC-001",
          name: "Civic Center Courthouse — Small Claims (Clerk’s Office)",
          address: "400 McAllister St., Room 103, San Francisco, CA 94102-4514",
          clerkUrl: "https://sf.courts.ca.gov/divisions/small-claims"
        }
      ]
    },

    {
      county: "Santa Cruz",
      courts: [
        {
          courtId: "SCZ-SC-001",
          name: "Watsonville Courthouse — Small Claims Division",
          address: "1 Second Street, Room 300, Watsonville, CA 95076",
          clerkUrl: "https://www.santacruz.courts.ca.gov/divisions/small-claims-division"
        }
      ]
    },

    {
      county: "Monterey",
      courts: [
        {
          courtId: "MTY-SC-001",
          name: "Monterey Courthouse — Small Claims (Filing Location)",
          address: "1200 Aguajito Rd, Monterey, CA 93940",
          clerkUrl: "https://www.monterey.courts.ca.gov/divisions/small-claims",
          notes:
            "Per court: filings at Monterey Courthouse (1200 Aguajito Rd); hearings at Marina Courthouse (3180 Del Monte Blvd, Marina, CA 93933)."
        }
      ]
    },

    {
      county: "Contra Costa",
      courts: [
        {
          courtId: "CC-SC-001",
          name: "Wakefield Taylor Courthouse (Martinez) — Small Claims",
          address: "725 Court Street, Martinez, CA 94553",
          clerkUrl: "https://contracosta.courts.ca.gov/divisions/small-claims"
        }
      ]
    },

    {
      county: "Sonoma",
      courts: [
        {
          courtId: "SN-SC-001",
          name: "Civil & Family Law Courthouse — Small Claims",
          address: "3055 Cleveland Ave., Santa Rosa, CA 95403",
          clerkUrl: "https://sonoma.courts.ca.gov/divisions/small-claims"
        }
      ]
    },

    // ===== LA area included (but NorCal focus first) =====
    {
      county: "Los Angeles",
      courts: [
        {
          courtId: "LA-SC-001",
          name: "Stanley Mosk Courthouse (Central District) — Small Claims",
          address: "111 N Hill St, Los Angeles, CA 90012",
          clerkUrl: "https://www.lacourt.org/division/smallclaims/smallclaims.aspx"
        }
      ]
    }
  ]
};

export default CA_JURISDICTION;


