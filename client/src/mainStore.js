"use strict"

import { observable } from "mobx"

export default observable({
    selectedEventKey: undefined,
    selectedPlayerKey: undefined,
    eventData: undefined,
    resultsData: undefined,
    playerData: {},
    eventSummaryData: undefined,
    sortedEventSummaryOptions: [],
    pointsData: undefined,
    initCount: 0,
    inited: false,
    startedInit: false
})
