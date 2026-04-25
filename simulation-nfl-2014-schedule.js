(function(root){
  'use strict';

  const NFL_2014_SCHEDULE_BY_WEEK = Object.freeze({
  "1": [
    {
      "homeAbbr": "SEA",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "SD"
    }
  ],
  "2": [
    {
      "homeAbbr": "BAL",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "PHI"
    }
  ],
  "3": [
    {
      "homeAbbr": "ATL",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "CHI"
    }
  ],
  "4": [
    {
      "homeAbbr": "WAS",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "NE"
    }
  ],
  "5": [
    {
      "homeAbbr": "GB",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "SEA"
    }
  ],
  "6": [
    {
      "homeAbbr": "HOU",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "SF"
    }
  ],
  "7": [
    {
      "homeAbbr": "NE",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "HOU"
    }
  ],
  "8": [
    {
      "homeAbbr": "DEN",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "WAS"
    }
  ],
  "9": [
    {
      "homeAbbr": "CAR",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "IND"
    }
  ],
  "10": [
    {
      "homeAbbr": "CIN",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "CAR"
    }
  ],
  "11": [
    {
      "homeAbbr": "MIA",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "PIT"
    }
  ],
  "12": [
    {
      "homeAbbr": "OAK",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "BAL"
    }
  ],
  "13": [
    {
      "homeAbbr": "DET",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "MIA"
    }
  ],
  "14": [
    {
      "homeAbbr": "CHI",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "JAX",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "ATL"
    }
  ],
  "15": [
    {
      "homeAbbr": "STL",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "PIT"
    },
    {
      "homeAbbr": "BUF",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "CLE",
      "awayAbbr": "CIN"
    },
    {
      "homeAbbr": "IND",
      "awayAbbr": "HOU"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "MIA"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "WAS"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "TB"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "TEN",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "SD",
      "awayAbbr": "DEN"
    },
    {
      "homeAbbr": "DET",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "SF"
    },
    {
      "homeAbbr": "PHI",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "NO"
    }
  ],
  "16": [
    {
      "homeAbbr": "JAX",
      "awayAbbr": "TEN"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "CHI",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "MIN"
    },
    {
      "homeAbbr": "NO",
      "awayAbbr": "ATL"
    },
    {
      "homeAbbr": "NYJ",
      "awayAbbr": "NE"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "KC"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "GB"
    },
    {
      "homeAbbr": "CAR",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "BAL"
    },
    {
      "homeAbbr": "STL",
      "awayAbbr": "NYG"
    },
    {
      "homeAbbr": "DAL",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "OAK",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "ARI",
      "awayAbbr": "SEA"
    },
    {
      "homeAbbr": "CIN",
      "awayAbbr": "DEN"
    }
  ],
  "17": [
    {
      "homeAbbr": "TEN",
      "awayAbbr": "IND"
    },
    {
      "homeAbbr": "KC",
      "awayAbbr": "SD"
    },
    {
      "homeAbbr": "MIA",
      "awayAbbr": "NYJ"
    },
    {
      "homeAbbr": "MIN",
      "awayAbbr": "CHI"
    },
    {
      "homeAbbr": "NE",
      "awayAbbr": "BUF"
    },
    {
      "homeAbbr": "NYG",
      "awayAbbr": "PHI"
    },
    {
      "homeAbbr": "TB",
      "awayAbbr": "NO"
    },
    {
      "homeAbbr": "WAS",
      "awayAbbr": "DAL"
    },
    {
      "homeAbbr": "BAL",
      "awayAbbr": "CLE"
    },
    {
      "homeAbbr": "HOU",
      "awayAbbr": "JAX"
    },
    {
      "homeAbbr": "ATL",
      "awayAbbr": "CAR"
    },
    {
      "homeAbbr": "DEN",
      "awayAbbr": "OAK"
    },
    {
      "homeAbbr": "GB",
      "awayAbbr": "DET"
    },
    {
      "homeAbbr": "SF",
      "awayAbbr": "ARI"
    },
    {
      "homeAbbr": "SEA",
      "awayAbbr": "STL"
    },
    {
      "homeAbbr": "PIT",
      "awayAbbr": "CIN"
    }
  ]
});

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function buildNfl2014ScheduleByWeek(){
    return clone(NFL_2014_SCHEDULE_BY_WEEK);
  }

  function flattenNfl2014Schedule(scheduleByWeek){
    const source = scheduleByWeek && typeof scheduleByWeek === 'object'
      ? scheduleByWeek
      : NFL_2014_SCHEDULE_BY_WEEK;

    return Object.keys(source)
      .map((week) => Number(week))
      .filter((week) => Number.isFinite(week))
      .sort((a, b) => a - b)
      .flatMap((week) => {
        const games = Array.isArray(source[week]) ? source[week] : [];
        return games.map((game) => ({
          week,
          homeAbbr: game.homeAbbr,
          awayAbbr: game.awayAbbr
        }));
      });
  }

  const api = {
    buildNfl2014ScheduleByWeek,
    flattenNfl2014Schedule
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.RosterBateNfl2014Schedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
