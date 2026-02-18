// Path: /app/_config/jurisdictions/ca.js

/**
 * California Small Claims Jurisdiction Config
 * Config-driven. No court rules hard-coded elsewhere.
 */

const CA_JURISDICTION = {
  state: "CA",
  stateName: "California",
  claimLimit: 10000,
  counties: [

    // ===== Alphabetized =====

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
      county: "Monterey",
      courts: [
        {
          courtId: "MTY-SC-001",
          name: "Monterey Courthouse — Small Claims (Filing Location)",
          address: "1200 Aguajito Rd, Monterey, CA 93940",
          clerkUrl: "https://www.monterey.courts.ca.gov/divisions/small-claims",
          notes:
            "Per court: filings at Monterey Courthouse; hearings at Marina Courthouse."
        }
      ]
    },

    {
      county: "San Diego",
      courts: [
        {
          courtId: "SD-SC-CENTRAL",
          name: "Central Division — Small Claims (Business Office / Filing)",
          address: "330 W Broadway, Room 225, San Diego, CA 92101",
          clerkUrl: "https://www.sdcourt.ca.gov/sdcourt/smallclaims2/smallclaimslocations"
        },
        {
          courtId: "SD-SC-NORTH",
          name: "North County Division — Vista Courthouse",
          address: "325 S Melrose Dr, Vista, CA 92081",
          clerkUrl:
            "https://www.sdcourt.ca.gov/sdcourt/generalinformation/courtlocations/northcountycourthouse"
        },
        {
          courtId: "SD-SC-EAST",
          name: "East County Division — El Cajon Courthouse",
          address: "250 E Main St, El Cajon, CA 92020",
          clerkUrl:
            "https://www.sdcourt.ca.gov/sdcourt/generalinformation/courtlocations/eastcountyregional"
        },
        {
          courtId: "SD-SC-SOUTH",
          name: "South County Division — Chula Vista Courthouse",
          address: "500 Third Ave, Chula Vista, CA 91910",
          clerkUrl:
            "https://www.sdcourt.ca.gov/sdcourt/generalinformation/courtlocations/southcountyregional"
        }
      ]
    },

    {
      county: "San Francisco",
      courts: [
        {
          courtId: "SF-SC-001",
          name: "Civic Center Courthouse — Small Claims",
          address: "400 McAllister St., Room 103, San Francisco, CA 94102",
          clerkUrl: "https://sf.courts.ca.gov/divisions/small-claims"
        }
      ]
    },

    {
      county: "San Mateo",
      courts: [
        {
          courtId: "SM-SC-001",
          name: "Hall of Justice & Records — Small Claims",
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
          name: "Downtown Superior Court — Small Claims",
          address: "191 North First Street, San Jose, CA 95113",
          clerkUrl: "https://santaclara.courts.ca.gov/location/downtown-superior-court-dts"
        }
      ]
    },

    {
      county: "Santa Cruz",
      courts: [
        {
          courtId: "SCZ-SC-001",
          name: "Watsonville Courthouse — Small Claims",
          address: "1 Second Street, Watsonville, CA 95076",
          clerkUrl: "https://www.santacruzcourts.ca.gov/divisions/small-claims-division"
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
    }
  ]
};

export default CA_JURISDICTION;




