
//Table is syncing itself from server to clients; thus it will not have the same edge-case issue as laser -> laser table syncing
NetworkEvents.dataReceived('project_unknown:laser_crafting_table_data', e => {
    e.level.getBlockEntity(new $BlockPos(e.data.laserpos.x, e.data.laserpos.y, e.data.laserpos.z)).getPersistentData().merge(e.data.lasertable)
})

//If table is across a chunk boundary, then the laser syncing will report table BE as null on first tick after rendering it in
NetworkEvents.dataReceived('project_unknown:laser_data', e => {
    let table = e.level.getBlockEntity(new $BlockPos(e.data.laserpos.x, e.data.laserpos.y, e.data.laserpos.z))
    if(table) table.getPersistentData().merge(e.data.lasertable)
})