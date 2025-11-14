/* eslint-disable react/prop-types */
import React, { useEffect } from "react"
import { observer } from "mobx-react"
import { observable, runInAction } from "mobx"
import { Tab, Tabs, TabList, TabPanel } from "react-tabs"
import ReactSelect from "react-select"
import {Collapse} from "react-collapse"

import "./App.css"
import "react-tabs/style/react-tabs.css"

import Common from "./common.js"
import MainStore from "./mainStore.js"

if (import.meta.hot) {
    import.meta.hot.on(
      "vite:beforeUpdate",
      () => {
        console.clear()
        runInAction(() => {
            MainStore.startedInit = false
        })
      }
    )
}

function getPlayersWidget(players, onclick) {
    if (players === undefined) {
        return <div className="playersWidget"/>
    }

    let playerWidgets = players.map((data) => {
        return <a key={data} href="" onClick={(e) => onclick(e, data)}>{Common.getPlayerNameString(data)}</a>
    })

    let playersCount = players.length
    let widgets = []
    for (let i = 0; i < playersCount; ++i) {
        widgets.push(playerWidgets[i])
        if (i < playersCount - 1) {
            widgets.push(" - ")
        }
    }

    return (
        <div className="playersWidget">
            {widgets}
        </div>
    )
}

const EventViewer = observer(class EventViewer extends React.Component {
    constructor() {
        super()
    }

    onPlayerClick(e, playerKey) {
        e.preventDefault()

        runInAction(() => {
            MainStore.selectedPlayerKey = playerKey
            MainStore.topTabSelectedIndex = 0
        })
    }

    getPoolWidget(poolData) {
        let teamRows = poolData.teamData.map((data) => {
            return (
                <tr key={data.place}>
                    <td>{data.place}</td>
                    <td>{getPlayersWidget(data.players, (e, playerKey) => this.onPlayerClick(e, playerKey))}</td>
                    <td>{data.points}</td>
                </tr>
            )
        })

        return (
            <div key={poolData.poolId.toUpperCase()} className="pool">
                <div className="poolHeader">Pool {poolData.poolId}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Place</th>
                            <th>Players</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamRows}
                    </tbody>
                </table>
            </div>
        )
    }

    getRoundWidget(roundData) {
        let poolKeys = []
        for (let key in roundData) {
            if (key.startsWith("pool")) {
                poolKeys.push(key)
            }
        }
        poolKeys.sort()
        let poolWidgets = []
        for (let key of poolKeys) {
            poolWidgets.push(this.getPoolWidget(roundData[key]))
        }

        return (
            <div key={roundData.id} className="round">
                <div className="roundHeader">{Common.getRoundNameFromId(roundData.id)}</div>
                {poolWidgets}
            </div>
        )
    }

    toggleCollapse(resultsData) {
        runInAction(() => {
            resultsData.open = !resultsData.open
        })
    }

    getDivisionWidget(resultsData) {
        if (resultsData === undefined) {
            return null
        }

        let roundWidgets = []
        let roundKeys = []
        for (let key in resultsData) {
            if (key.startsWith("round")) {
                roundKeys.push(key)
            }
        }
        roundKeys.sort()
        for (let key of roundKeys) {
            roundWidgets.push(this.getRoundWidget(resultsData[key]))
        }
        return (
            <div className="division">
                <div className="divisionHeader">
                    <button onClick={() => this.toggleCollapse(resultsData)}>{resultsData.open ? "V" : ">"}</button>
                    {resultsData.divisionName}
                </div>
                <Collapse isOpened={resultsData.open}>
                    {roundWidgets}
                </Collapse>
            </div>
        )
    }

    getResultsWidget() {
        if (MainStore.resultsData === undefined || MainStore.selectedEventKey === undefined) {
            return null
        }
        let results = Object.values(MainStore.resultsData).filter((data) => data.eventId === MainStore.selectedEventKey).map((data) => {
            runInAction(() => {
                if (data.resultsData.open === undefined) {
                    data.resultsData.open = true
                }
            })
            return this.getDivisionWidget(data.resultsData)
        })

        return (
            <div>
                {results}
            </div>
        )
    }

    onSelectEventChanged(selected) {
        runInAction(() => {
            MainStore.selectedEventKey = selected.value

            if (MainStore.eventData !== undefined) {
                MainStore.eventData.eventName = selected.label
            }
        })
    }

    render() {
        let selectedEventValue = null
        let eventSummaryData = MainStore.eventSummaryData[MainStore.selectedEventKey]
        if (eventSummaryData !== undefined) {
            selectedEventValue = {
                value: eventSummaryData.key,
                label: eventSummaryData.eventName
            }
        }

        return (
            <div className="results">
                <ReactSelect value={selectedEventValue} options={MainStore.sortedEventSummaryOptions} onChange={(e) => this.onSelectEventChanged(e)}/>
                {this.getResultsWidget()}
            </div>
        )
    }
})

const PlayerViewer = observer(class PlayerViewer extends React.Component {
    constructor() {
        super()
    }

    onPlayerClick(e, playerKey) {
        e.preventDefault()

        runInAction(() => {
            MainStore.selectedPlayerKey = playerKey
            MainStore.topTabSelectedIndex = 0
        })
    }

    getPlayerStatsWidget(playerId) {
        if (MainStore.inited !== true) {
            return null
        }

        if (playerId === undefined || playerId === null) {
            return null
        }

        let stats = Common.getPlayerStats(playerId)

        return (
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>Events</th>
                            <th>Wins</th>
                            <th>Ranking</th>
                            <th>Rating</th>
                            <th>Highest Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{stats.eventCount}</td>
                            <td>{stats.winCount}</td>
                            <td>{stats.ranking}</td>
                            <td>{stats.rating}</td>
                            <td>{stats.highestRating}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        )
    }

    getSortedPlayers(firstPlayerId, players) {
        if (players === undefined) {
            return players
        }

        if (players.length === 0) {
            return players
        }

        if (players[0] === firstPlayerId) {
            return players
        }

        let ret = players.slice()
        let index = players.findIndex((data) => data === firstPlayerId)
        if (index >= 0) {
            ret.splice(index, 1)
            ret.splice(0, 0, firstPlayerId)
        }

        return ret
    }

    onClickEvent(e, eventKey) {
        e.preventDefault()

        runInAction(() => {
            MainStore.selectedEventKey = eventKey
            MainStore.topTabSelectedIndex = 1
        })
    }

    getPlayerEventsWidget(playerId) {
        let details = Common.getPlayerEventDetails(playerId)
        let rows = details.map((data) => {
            return (
                <tr key={Math.random()}>
                    <td>{data.startDate}</td>
                    <td><a key={data} href="" onClick={(e) => this.onClickEvent(e, data.eventId)}>{data.eventName}</a></td>
                    <td>{data.divisionName}</td>
                    <td>{data.place}</td>
                    <td>{getPlayersWidget(this.getSortedPlayers(playerId, data.players), (e, playerKey) => this.onPlayerClick(e, playerKey))}</td>
                </tr>
            )
        })

        return (
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>Start Date</th>
                            <th>Event Name</th>
                            <th>Division Name</th>
                            <th>Place</th>
                            <th>Team</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
        )
    }

    onSelectPlayerChanged(selected) {
        runInAction(() => {
            MainStore.selectedPlayerKey = selected.value

            if (MainStore.eventData !== undefined) {
                MainStore.eventData.eventName = selected.label
            }
        })
    }

    render() {
        if (MainStore.inited !== true) {
            return null
        }

        let selectedPlayerValue = null
        let playerData = MainStore.playerData[MainStore.selectedPlayerKey]
        if (playerData !== undefined) {
            selectedPlayerValue = {
                value: playerData.key,
                label: Common.getPlayerNameString(MainStore.selectedPlayerKey)
            }
        }

        let playerOptions = []
        for (let playerKey in MainStore.playerData) {
            let playerData = MainStore.playerData[playerKey]
            if (playerData.aliasKey === undefined) {
                playerOptions.push({
                    value: playerKey,
                    label: Common.getPlayerNameString(playerKey)
                })
            }
        }

        return (
            <div>
                <ReactSelect value={selectedPlayerValue} options={playerOptions} onChange={(e) => this.onSelectPlayerChanged(e)}/>
                {this.getPlayerStatsWidget(MainStore.selectedPlayerKey)}
                {this.getPlayerEventsWidget(MainStore.selectedPlayerKey)}
            </div>
        )
    }
})


const App = observer(class App extends React.Component {
    constructor() {
        super()

        let topTabSelectedIndex = 0
        let url = new URL(window.location.href)
        let playerKey = url.searchParams.get("playerKey")
        if (playerKey) {
            runInAction(() => {
                MainStore.selectedPlayerKey = playerKey
            })
        }
        else
        {
            let eventKey = url.searchParams.get("eventKey")
            if (eventKey) {
                topTabSelectedIndex = 1
                MainStore.selectedEventKey = eventKey
            }
        }

        runInAction(() => {
            MainStore.topTabSelectedIndex = topTabSelectedIndex
            MainStore.inited = false
        })

        if (!MainStore.startedInit) {
            runInAction(() => {
                MainStore.startedInit = true
            })
            Common.downloadAllData().then(() => {
                runInAction(() => {
                    MainStore.inited = true
                })
            })
        }
    }

    onTopTabSelectedChanged(e) {
        runInAction(() => {
            MainStore.topTabSelectedIndex = e
        })
    }

    getLoadingWidget() {
        let loadingPercent = MainStore.initCount / 4 * 100
        return (
            <div className="loadingTop">
                <div className="outer">
                    <div className="inner" style={{width: `${loadingPercent}%`}}/>
                </div>
                <div className="per">
                    Loading {loadingPercent}%
                </div>
            </div>
        )
    }

    render() {
        if (MainStore.inited !== true) {
            return this.getLoadingWidget()
        }

        return (
            <div className="viewerTop">
                <Tabs selectedIndex={MainStore.topTabSelectedIndex} onSelect={(e) => this.onTopTabSelectedChanged(e)}>
                    <TabList>
                        <Tab>Players</Tab>
                        <Tab>Events</Tab>
                    </TabList>
                    <TabPanel>
                        <PlayerViewer/>
                    </TabPanel>
                    <TabPanel>
                        <EventViewer/>
                    </TabPanel>
                </Tabs>
            </div>
        )
    }
})

export default App
