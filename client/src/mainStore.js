"use strict"

import { observable } from "mobx"

export default observable({
    selectedEventKey: undefined,
    eventData: undefined,
    resultsData: undefined,
    isPlayerMainWidgetEnabled: false,
    playerData: {},
    eventSummaryData: undefined,
    pointsData: undefined,
    cachedFullNames: [],
    cachedRegisteredFullNames: [],
    startup: undefined
})
