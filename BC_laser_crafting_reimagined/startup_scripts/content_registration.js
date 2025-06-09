StartupEvents.registry('block', event => {

	event.create(`${MOD_ID}:laser_crafting_table`)
		.hardness(6)
		.requiresTool(true)
		.tag(['minecraft:mineable/pickaxe'])
		.fullBlock(false)
		.notSolid()
		.renderType("cutout")
		.modelGenerator(model => {
			model.parent(`${MOD_ID}:block/laser`)
		})
		.blockEntity(info => {
			//name of this attachment, [sides other blocks can interact through], rows, columns
			info.inventory('inventory', ['DOWN', 'UP', 'NORTH', 'SOUTH', 'WEST', 'EAST'], 9, 3)
			//multiple inventories can exist in a block; this one is called "crafting", and does not allow for any sided interactions
			info.inventory('crafting', [], 1, 1)
			info.rightClickOpensInventory('inventory')
			info.ticking()
			info.tickFrequency(1)
			info.enableSync()
		})
		.box(0.1, 0, 0.1, 0.9, 0.9, 0.9, false)

	let lasertooltip = Text.of('').append(Text.gold('Consumes ')).append(Text.aqua('40 ')).append(Text.gold('RF/t to power 1 nearby ')).append(Text.red('Laser Crafting Table'))
	event.create(`${MOD_ID}:laser`)
		.hardness(6)
		.requiresTool(true)
		.tag(['minecraft:mineable/pickaxe'])
		.fullBlock(false)
		.notSolid()
		.renderType("cutout")
		.modelGenerator(model => {
			model.parent(`${MOD_ID}:block/laser`)
		})
		.blockEntity(info => {
			info.ticking()
			info.tickFrequency(1)
			let capacity = 400, recieve = 40, extract = 0, autooutput = 0 
			info.energyStorage('laser_storage',['DOWN', 'UP', 'NORTH', 'SOUTH', 'WEST', 'EAST'], capacity, recieve, extract, autooutput)
			info.enableSync()
		})
		.item(i => {
			i.tooltip(lasertooltip)
		})
})