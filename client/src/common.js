/* eslint-disable no-alert */
"use strict"

import MainStore from "./mainStore.js"
import buildUrl from "./endpoints.js"
import { runInAction } from "mobx"

const poolKeyPrefix = "pool|"
let Common = {}

Common.divisionNames = [
    "Open Pairs",
    "Mixed Pairs",
    "Open Co-op",
    "Women Pairs"
]

Common.roundNames = [
    "Finals",
    "Semifinals",
    "Quarterfinals",
    "Preliminaries"
]

Common.poolNames = [
    "A",
    "B",
    "C",
    "D"
]

Common.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(key, pathParams, queryParams), options).then((response) => {
        return response.json()
    })
}

Common.downloadAllData = function() {
    runInAction(() => {
        MainStore.initCount = 0
    })

    let playerDataPomise = Common.fetchEx("GET_PLAYER_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.playerData = data.players
        console.log("GET_PLAYER_DATA", data.players)

        MainStore.cachedFullNames = []
        for (let id in MainStore.playerData) {
            let playerData = MainStore.playerData[id]
            MainStore.cachedFullNames.push(playerData.firstName + " " + playerData.lastName)
        }

        runInAction(() => {
            ++MainStore.initCount
        })
    }).catch((error) => {
        console.error(`Failed to download Player data: ${error}`)
    })

    let eventSummaryDataPromise = Common.fetchEx("GET_EVENT_SUMMARY_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.eventSummaryData = data.allEventSummaryData

        let eventSummaryOptions = []
        for (let eventKey in MainStore.eventSummaryData) {
            let data = MainStore.eventSummaryData[eventKey]
            eventSummaryOptions.push({
                value: eventKey,
                label: data.eventName,
                startDate: data.startDate
            })
        }
        eventSummaryOptions.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        MainStore.sortedEventSummaryOptions = eventSummaryOptions

        console.log("GET_EVENT_SUMMARY_DATA", data.allEventSummaryData)
        runInAction(() => {
            ++MainStore.initCount
        })
    }).catch((error) => {
        console.error(`Failed to download Event data: ${error}`)
    })

    let resultsDataPromise = Common.fetchEx("GET_RESULTS_DATA", {}, {}, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
    }).then((data) => {
        MainStore.resultsData = data.results
        console.log("GET_RESULTS_DATA", data.results)
        runInAction(() => {
            ++MainStore.initCount
        })
    }).catch((error) => {
        console.error(`Failed to download Results data: ${error}`)
    })

    let pointsDataPromise = Common.fetchEx("GET_POINTS_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        console.log("GET_POINTS_DATA", data)
        MainStore.pointsData = data.data
        runInAction(() => {
            ++MainStore.initCount
        })
    }).catch((error) => {
        console.error(`Failed to download points data: ${error}`)
    })

    return Promise.all([playerDataPomise, eventSummaryDataPromise, resultsDataPromise, pointsDataPromise])
}

Common.makePoolKey = function(eventKey, divisionName, roundName, poolName) {
    return `${poolKeyPrefix}${eventKey}|${divisionName}|${roundName}|${poolName}`
}

Common.findPlayerByFullName = function(inFullName) {
    for (let key in MainStore.playerData) {
        let playerData = MainStore.playerData[key]
        let fullName = playerData.firstName + " " + playerData.lastName
        if (inFullName === fullName) {
            return playerData
        }
    }

    return undefined
}

Common.getPlayerNameString = function(playerKey) {
    if (MainStore.playerData === undefined) {
        return "Unknown"
    }

    let playerData = MainStore.playerData[playerKey]
    let name = "Unknown"
    if (playerData !== undefined) {
        name = `${playerData.firstName} ${playerData.lastName}`
    }

    return name
}

Common.getPlayerNamesString = function(playerKeyArray) {
    if (MainStore.playerData === undefined) {
        return ""
    }

    return playerKeyArray.map((key) => {
        return Common.getPlayerNameString(key)
    }).join(" - ")
}

Common.getPlayerNameString = function(playerKey) {
    if (MainStore.playerData === undefined) {
        return "Unknown"
    }

    let playerData = MainStore.playerData[playerKey]
    let name = "Unknown"
    if (playerData !== undefined) {
        name = `${playerData.firstName} ${playerData.lastName}`
    }

    return name
}

Common.getSortedJudgeKeyArray = function(poolData) {
    if (poolData === undefined) {
        return []
    }

    let judges = []
    for (let judgeKey in poolData.judges) {
        judges.push({
            judgeKey: judgeKey,
            categoryType: poolData.judges[judgeKey]
        })
    }

    judges.sort((a, b) => {
        if (a.categoryType === b.categoryType) {
            return a.judgeKey.localeCompare(b.judgeKey)
        } else {
            return a.categoryType.localeCompare(b.categoryType)
        }
    })

    return judges.map((data) => data.judgeKey)
}

Common.poolDataContainsCompetitor = function(poolData, competitorKey) {
    if (poolData === undefined) {
        return false
    }

    for (let teamData of poolData.teamData) {
        if (teamData.players.find((key) => key === competitorKey) !== undefined) {
            return true
        }
    }

    return false
}

Common.poolDataContainsJudge = function(poolData, judgeKey) {
    return poolData && poolData.judges[judgeKey] !== undefined
}

Common.getMissingDivisionName = function() {
    if (MainStore.eventData === undefined) {
        return undefined
    }

    for (let divisionName of Common.divisionNames) {
        if (MainStore.eventData.eventData.divisionData[divisionName] === undefined) {
            return divisionName
        }
    }

    return undefined
}

Common.getMissingRoundName = function(divisionName) {
    if (MainStore.eventData === undefined) {
        return undefined
    }

    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]

    for (let roundName of Common.roundNames) {
        if (divisionData.roundData[roundName] === undefined) {
            return roundName
        }
    }

    return undefined
}

Common.divisionHasPools = function(divisionName) {
    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
    if (divisionData && divisionData.roundData) {
        for (let roundName in divisionData.roundData) {
            if (Common.roundHasPools(divisionName, roundName)) {
                return true
            }
        }
    }

    return false
}

Common.roundHasPools = function(divisionName, roundName) {
    let divisionData = MainStore.eventData.eventData.divisionData[divisionName]
    let roundData = divisionData.roundData[roundName]
    if (roundData && roundData.poolNames.length > 0) {
        return true
    }

    return false
}

Common.getPoolDataContainingPlayer = function(playerKey) {
    for (let divisionName of Common.divisionNames) {
        for (let roundName of Common.roundNames) {
            for (let poolName of Common.poolNames) {
                let poolData = Common.getPoolData(divisionName, roundName, poolName)
                if (poolData !== undefined) {
                    if (Common.poolDataContainsCompetitor(poolData, playerKey)) {
                        return poolData
                    }
                    if (Common.poolDataContainsJudge(poolData, playerKey)) {
                        return poolData
                    }
                }
            }
        }
    }

    return undefined
}

Common.getPoolData = function(divisionName, roundName, poolName) {
    let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionName, roundName, poolName)
    return MainStore.eventData.eventData.poolMap[poolKey]
}

Common.getPlayerJudgedCount = function(playerKey) {
    let count = 0
    for (let poolKey in MainStore.eventData.eventData.poolMap) {
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        if (Common.poolDataContainsJudge(poolData, playerKey)) {
            ++count
        }
    }

    return count
}

Common.getPlayerRankingPointsByRankingName = function(playerKey, rankingName) {
    let pointsData = MainStore.pointsData[rankingName].find((data) => data.id === playerKey)
    return pointsData && pointsData.points || 0
}

Common.getPlayerRankingPointsByDivision = function(playerKey, divisionName) {
    let playerData = MainStore.playerData[playerKey]
    switch (divisionName) {
    case "Women Pairs":
        if (playerData.gender === "F") {
            return Common.getPlayerRankingPointsByRankingName(playerKey, "ranking-women")
        } else {
            return 0
        }
    case "Mixed Pairs":
        if (playerData.gender === "F") {
            return Common.getPlayerRankingPointsByRankingName(playerKey, "ranking-women")
        }
    }

    return Common.getPlayerRankingPointsByRankingName(playerKey, "ranking-open")
}

Common.getTeamRankingPointsByDivision = function(playerKeys, divisionName) {
    let sum = 0
    for (let playerKey of playerKeys) {
        sum += Common.getPlayerRankingPointsByDivision(playerKey, divisionName)
    }

    return sum
}

// Common.getSimilarPlayerDataByName = function(name, nameList) {
//     let bestNames = []
//     const maxCount = 10
//     for (let cachedName of nameList) {
//         let similar = StringSimilarity.compareTwoStrings(name, cachedName)
//         if (similar > 0) {
//             if (bestNames.length < maxCount || similar > bestNames[maxCount - 1].score) {
//                 let index = bestNames.findIndex((data) => data.score < similar)
//                 bestNames.splice(index >= 0 ? index : bestNames.length, 0, {
//                     name: cachedName,
//                     score: similar
//                 })

//                 if (bestNames.length > maxCount) {
//                     bestNames.pop()
//                 }
//             }
//         }
//     }

//     let playerDatas = []
//     for (let data of bestNames) {
//         playerDatas.push(Common.findPlayerByFullName(data.name))
//     }

//     return playerDatas
// }

Common.getPlaceFromNumber = function(number) {
    switch (number) {
    case 1:
        return "1st"
    case 2:
        return "2nd"
    case 3:
        return "3rd"
    default:
        return `${number}th`
    }
}

Common.getPreviousRoundName = function(roundName) {
    let index = Common.roundNames.findIndex((name) => name === roundName)
    if (index < 0) {
        return undefined
    }

    return index + 1 < Common.roundNames.length ? Common.roundNames[index + 1] : undefined
}

Common.getPoolLetter = function(index) {
    return String.fromCharCode("A".charCodeAt(0) + index)
}

Common.getRoundNameFromId = function(id) {
    return Common.roundNames[id - 1]
}

function getResultsWithPlayer(playerId) {
    let resultsList = []
    for (let resultsData of Object.values(MainStore.resultsData)) {
        let found = false
        for (let roundKey in resultsData.resultsData) {
            if (roundKey.startsWith("round")) {
                let roundData = resultsData.resultsData[roundKey]
                for (let poolKey in roundData) {
                    if (poolKey.startsWith("pool")) {
                        let poolData = roundData[poolKey]
                        for (let teamData of poolData.teamData) {
                            if (teamData.players.find((data) => data === playerId)) {
                                found = true
                                break
                            }
                        }
                    }

                    if (found) {
                        break
                    }
                }
            }

            if (found) {
                break
            }
        }

        let eventSummaryData = MainStore.eventSummaryData[resultsData.eventId]
        if (found && eventSummaryData && eventSummaryData.startDate !== undefined) {
            resultsList.push(resultsData.key)
        }
    }

    resultsList.sort((a, b) => {
        return getEventStartDate(MainStore.resultsData[b].eventId) - getEventStartDate(MainStore.resultsData[a].eventId)
    })

    return resultsList
}

function getEventStartDate(eventKey) {
    let eventSummaryData = MainStore.eventSummaryData[eventKey]
    if (eventSummaryData === undefined) {
        return new Date()
    }

    return new Date(eventSummaryData.startDate)
}

Common.getPlayerStats = function(playerId) {

    let openRanking = MainStore.pointsData["ranking-open"].find((data) => playerId === data.id)
    let openRating = MainStore.pointsData["rating-open"].find((data) => playerId === data.id)

    let winCount = 0
    let resultsList = getResultsWithPlayer(playerId)
    for (let resultsDataKey of resultsList) {
        let resultsData = MainStore.resultsData[resultsDataKey].resultsData
        let winningTeamData = resultsData &&
            resultsData.round1 &&
            resultsData.round1.poolA &&
            resultsData.round1.poolA.teamData &&
            resultsData.round1.poolA.teamData[0]
        if (winningTeamData !== undefined) {
            if (winningTeamData.players.find((data) => data === playerId) !== undefined) {
                ++winCount
            }
        }
    }

    return {
        eventCount: resultsList.length,
        winCount: winCount,
        ranking: openRanking ? openRanking.rank : "N/A",
        rating: openRating ? Math.round(openRating.rating) : "N/A",
        highestRating: openRating ? Math.round(openRating.highestRating) : "N/A"
    }
}

Common.getPlayerEventDetails = function(playerId) {
    let resultsList = getResultsWithPlayer(playerId)
    let eventsDetails = resultsList.map((resultsKey) => {
        let resultsData = MainStore.resultsData[resultsKey]
        let eventSummaryData = MainStore.eventSummaryData[resultsData.eventId]
        let placeAndTeam = findPlaceAndTeamInResults(resultsKey, playerId)
        let details = {
            eventName: resultsData.eventName,
            divisionName: resultsData.divisionName,
            place: placeAndTeam.place,
            players: placeAndTeam.players,
            startDate: eventSummaryData ? eventSummaryData.startDate : "",
            eventId: resultsData.eventId
        }

        return details
    })

    return eventsDetails
}

function findPlaceAndTeamInResults(resultsKey, playerKey) {
    let resultsData = MainStore.resultsData[resultsKey].resultsData
    let roundIds = []
    for (let roundId in resultsData) {
        if (roundId.startsWith("round")) {
            roundIds.push(roundId)
        }
    }

    // Can't handle more than 9 rounds
    roundIds = roundIds.sort((a, b) => {
        return a - b
    })

    let loseTeams = new Set()
    for (let roundId of roundIds) {
        let roundData = resultsData[roundId]
        let poolIds = []
        for (let poolId in roundData) {
            if (poolId.startsWith("pool")) {
                poolIds.push(poolId)
            }
        }

        let finishedPoolIds = new Set()
        let teamIndex = 0
        while (finishedPoolIds.size < poolIds.length) {
            let addLoseTeams = []
            for (let poolId of poolIds) {
                if (finishedPoolIds.has(poolId)) {
                    continue
                }

                let teamDataArray = roundData[poolId].teamData
                if (teamIndex >= teamDataArray.length) {
                    finishedPoolIds.add(poolId)
                    continue
                }

                let teamData = teamDataArray[teamIndex]
                if (isPlayerInTeam(playerKey, teamData))
                {
                    return {
                        place: loseTeams.size + 1,
                        players: teamData.players
                    }
                }

                addLoseTeams.push(getTeamKey(teamData))
            }

            for (let teamKey of addLoseTeams) {
                loseTeams.add(teamKey)
            }

            ++teamIndex
        }
    }

    return 0
}

function getTeamKey(teamData) {
    return teamData.players.join("-")
}

function isPlayerInTeam(playerKey, teamData) {
    return teamData.players.find((data) => data === playerKey) !== undefined
}

Common.getOriginalPlayerData = function(playerKey) {
    let playerData = MainStore.playerData[playerKey]
    if (playerData === undefined) {
        return undefined
    }

    while (playerData.aliasKey !== undefined) {
        let originalData = MainStore.playerData[playerData.aliasKey]
        if (originalData === undefined) {
            break
        }

        playerData = originalData
    }

    return playerData
}

export default Common
