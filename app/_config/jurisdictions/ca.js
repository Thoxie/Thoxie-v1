/**
 * California Small Claims Jurisdiction Config
 * Config-driven. No court rules hard-coded elsewhere.
 */

const CA_JURISDICTION = {
  state: "CA",
  stateName: "California",
  claimLimit: 10000,
  counties: [
    {
      county: "San Mateo",
      courts: [
        {
          courtId: "SM-SC-001",
          name: "San Mateo County Small Claims Court",
          address: "400 County Center, Redwood City, CA 94063",
          clerkUrl: "https://www.sanmateocourt.org"
        }
      ]
    },
    {
      county: "Los Angeles",
      courts: [
        {
          courtId: "LA-SC-001",
          name: "Los Angeles County Small Claims Court",
          address: "111 N Hill St, Los Angeles, CA 90012",
          clerkUrl: "https://www.lacourt.org"
        }
      ]
    }
  ]
};

export default CA_JURISDICTION;

