const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const convertStatesArray = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertDistrictsArray = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.get("/states/", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state;`;
  const statesArray = await db.all(getStatesQuery);
  const newStatesArray = [];
  for (let obj of statesArray) {
    newStatesArray.push(convertStatesArray(obj));
  }
  response.send(newStatesArray);
});

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStatesArray(state));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `INSERT INTO district (district_name,state_id,
  cases,cured,active,deaths)
  VALUES('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`;
  const dbResponse = await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictsArray(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `UPDATE district
  SET district_name = '${districtName}',state_id = '${stateId}',cases= '${cases}',cured = '${cured}',active = '${active}',deaths = '${deaths}'
  WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;
  const districtDetails = request.body;
  const { cases, cured, active, deaths } = districtDetails;
  const getStatisticsQuery = `SELECT SUM(cases) as totalCases,
                                       SUM(cured) as totalCured,
                                       SUM(active) as totalActive,
                                       SUM(deaths) as totalDeaths
                                FROM district WHERE state_id = ${stateId};`;
  const statistics = await db.get(getStatisticsQuery);
  response.send(statistics);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateIdByDstQuery = `
        SELECT state_id FROM district 
        WHERE district_id = ${districtId};
    `;
  const stateIdResponse = await db.get(getStateIdByDstQuery);

  const getStateNameQuery = `SELECT state_name AS stateName FROM state
                                WHERE state_id = ${stateIdResponse.state_id};`;
  const stateName = await db.get(getStateNameQuery);
  response.send(stateName);
});

module.exports = app;
