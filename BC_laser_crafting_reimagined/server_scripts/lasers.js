
let $BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
let $HashMap = Java.loadClass('java.util.HashMap') 
let $ItemHandlerUtils = Java.loadClass('dev.latvian.mods.kubejs.item.ItemHandlerUtils')

let LCT = 'project_unknown:laser_crafting_table_location'
let LIA = 'project_unknown:laser_is_active'
let TIC = 'project_unknown:table_is_crafting'
let RME = 'project_unknown:laser_recipe_max_energy'
let RCE = 'project_unknown:laser_recipe_current_energy'
let CRI = 'project_unknown:laser_recipe_current_recipe_by_input'

let LD = 'project_unknown:laser_data'
let LCTD = 'project_unknown:laser_crafting_table_data'


let laser_input = 40
let cost_by_time = (lasers, seconds) => {
    return laser_input * 20 * seconds * lasers
}

//Should really make a better recipe structure but this works for now
let set_laser_recipes = () => {
    let filter = new $HashMap()
    filter.put('minecraft:diamond', { input: { item: 'minecraft:diamond' }, energyCost: cost_by_time(1,10), output: { item: 'minecraft:diamond_block', amount: 1 } })
    filter.put('minecraft:diamond_block', { input: { item: 'minecraft:diamond_block' }, energyCost: cost_by_time(12,10), output: { item: 'minecraft:nether_star', amount: 1 } })
    filter.put('minecraft:heart_of_the_sea', { input: { item: 'minecraft:heart_of_the_sea' }, energyCost: cost_by_time(25,256), output: { item: 'minecraft:nether_star', amount: 1 } })
    filter.put('minecraft:iron_ingot', { input: { item: 'minecraft:iron_ingot' }, energyCost: cost_by_time(25,8), output: { item: 'minecraft:iron_sword', amount: 1 } })
    return filter
}

let laser_recipes = set_laser_recipes()


BlockEvents.blockEntityTick('project_unknown:laser', event => {
    let entity = event.block.entity
    let energy = entity.attachments.get('laser_storage')
    let level = entity.level
    let pos = event.block.pos
    
    if(!entity.getPersistentData().contains(LCT) && level.dayTime() % 100 == 0){
        let center = event.block.pos.below(4)
        let corner1 = center.north(2).west(2)
        let corner2 = center.south(2).east(2)

        let lasers = []
        //BetweenClosed is an optimized stream of MutableBlockPos. *Always* save a blockpos to a var by calling .immutable()! Otherwise it will automagically be the last blockpos in the stream!
        $BlockPos.betweenClosed(center.north(2).west(2), center.south(2).east(2)).forEach(bpos => {
            if(level.getBlock(bpos).id == 'project_unknown:laser_crafting_table'){
                lasers.push(bpos.immutable())
            }
        })
        if(lasers.length != 1)
            return
        
        entity.getPersistentData()['putIntArray(java.lang.String,int[])'](LCT, [lasers[0].x, lasers[0].y, lasers[0].z])
        sendCustomPayload(LD, level, pos, entity.getPersistentData())
    }
    if(!entity.getPersistentData().contains(LCT))
        return

    //sync every 4s as a backup
    if(level.getTime() % 80 == 0)
        sendCustomPayload(LD, level, pos, entity.getPersistentData())

    let c = entity.getPersistentData().getIntArray(LCT)
    if(c[0] == 0 && c[1] == -1 && c[2] == 0){
        entity.getPersistentData().remove(LCT)
        return
    }
    let tablepos = new $BlockPos(c[0], c[1], c[2])
    let lasertable = level.getBlockEntity(tablepos)
    if(!lasertable){
        entity.getPersistentData()['putIntArray(java.lang.String,int[])'](LCT, [0, -1, 0])
        if(entity.getPersistentData().getBoolean(LIA) == true)
            entity.getPersistentData().putBoolean(LIA, false)
        sendCustomPayload(LD, level, pos, entity.getPersistentData())
        entity.sync()
        return
    }

    let tdata = lasertable.getPersistentData()
    if(!tdata.contains(TIC) || !tdata.contains(RME) || !tdata.contains(RCE)){
        if(entity.getPersistentData().getBoolean(LIA) == true){
            entity.getPersistentData().putBoolean(LIA, false)
            sendCustomPayload(LD, level, pos, entity.getPersistentData())
        }
        return
    }

    //check if the table is currently crafting something
    if(!tdata.getBoolean(TIC)){
        if(entity.getPersistentData().getBoolean(LIA) == true){
            entity.getPersistentData().putBoolean(LIA, false)
            sendCustomPayload(LD, level, pos, entity.getPersistentData())
        }

        return
    }

    //is the table crafting? Is the current energy < max energy?          Does the laser have enough power?
    if(tdata.getBoolean(TIC) && tdata.getInt(RCE) < tdata.getInt(RME) && energy.getEnergyStored() >= 40){
        energy.useEnergy(40, false)
        tdata.putInt(RCE, tdata.getInt(RCE) + 40)
        entity.getPersistentData().putBoolean(LIA, true)
        sendCustomPayload(LD, level, pos, entity.getPersistentData())
        return
    }
    if(entity.getPersistentData().getBoolean(LIA) == true){
        entity.getPersistentData().putBoolean(LIA, false)
        sendCustomPayload(LD, level, pos, entity.getPersistentData())
    }
    
})

BlockEvents.blockEntityTick('project_unknown:laser_crafting_table', event => {
    let entity = event.block.entity
    let data = entity.getPersistentData()
    let inventory = entity.attachments.get('inventory')
    let craftinginv = entity.attachments.get('crafting')
    if(!data.contains(TIC)){
        data.putBoolean(TIC, false)
        sendCustomPayload(LCTD, entity.level, event.block.pos, data)
    }

    //sync every 4s as a backup
    if(entity.level.getTime() % 80 == 0)
        sendCustomPayload(LCTD, entity.level, event.block.pos, entity.getPersistentData())

    //!Table Is Crafting
    if(!data.getBoolean(TIC)){
        for(let i = 0; i < inventory.getSlots(); i++){
            if(laser_recipes.containsKey(inventory.getStackInSlot(i).item.id)){
                let recipe = laser_recipes.get(inventory.getStackInSlot(i).item.id)
                craftinginv.insertItem(0, inventory.extractItem(i, 1, false), false)
                data.putBoolean(TIC, true)
                data.putString(CRI, recipe.input.item)
                data.putInt(RME, recipe.energyCost)
                data.putInt(RCE, 0)
                sendCustomPayload(LCTD, entity.level, event.block.pos, data)
                break
            }
        }

    }
    
    //Table Is Crafting
    if(data.getBoolean(TIC)){
        let max_energy = data.getInt(RME)
        let current_energy = data.getInt(RCE)
        if(current_energy >= max_energy){
            let recipe = laser_recipes.get(data.getString(CRI))
            data.putBoolean(TIC, false)
            data.putInt(RME, -1)
            data.putInt(RCE, 0)
            data.putString(CRI, 'minecraft:air')
            craftinginv.extractItem(0, 1, false)
            let output = Item.of(recipe.output.item, recipe.output.amount)
            //Attempt to put the result in the regular inventory. It returns whichever items didn't fit, in which case we'll have to toss it out into the world
            let remainder = $ItemHandlerUtils.insertItemStacked(inventory, output, false)

            //Should only happen if inventory is full
            if(!remainder.isEmpty())
                event.block.popItemFromFace(output, 'UP')
        }
        sendCustomPayload(LCTD, entity.level, event.block.pos, data)
    }
})

//This checks for players within 64 blocks
//For each player in range, sends a packet of data which is then unpacked in client_scripts/laser_syncing.js
//be very mindful to not bog down the server-client network too much, and only send when the BE has actually done *something*
let sendCustomPayload = (id, level, pos, compoundtag) => {
	level.players.stream()
		.filter(player => player.distanceToSqr(pos) <= 4096) //distance we get is squared, so actual distance we want to check should be <= 64 blocks
		.forEach(player => {
			player.sendData(id, {
				lasertable: compoundtag,
				laserpos: {
					x: pos.x,
					y: pos.y,
					z: pos.z
				}
			})
		})
}