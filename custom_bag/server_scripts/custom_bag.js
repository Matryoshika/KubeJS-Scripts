let $SC = Java.loadClass('net.minecraft.world.SimpleContainer')
let $DC = Java.loadClass('net.minecraft.core.component.DataComponents')
let $ICC = Java.loadClass('net.minecraft.world.item.component.ItemContainerContents')
let customBagSizes = Utils.newMap()

ItemEvents.rightClicked('kubejs:leather_bag', event => {
	buildAndOpenInventory(event, 9, 3)
})
ItemEvents.rightClicked('kubejs:iron_bag', event => {
	buildAndOpenInventory(event, 9, 4)
})
ItemEvents.rightClicked('kubejs:diamond_bag', event => {
	buildAndOpenInventory(event, 9, 6)
})

/**
 * @param {slots} how many slots this bag should contain. Does not care about individual columns or rows, just total columns*rows
 */
let fetchSizedBag = (slots) => {
	return customBagSizes.computeIfAbsent(slots, key => {
		let inv = new Array(Number(key))
		return inv.fill(Item.of('minecraft:air'))
	})
}

/**
 * @param {event} the rightClicked event
 * @param {col} the amount of columns wide this bag should be
 * @param {row} the amount of rows tall this bag should be
 *
 * Builds the container and opens it for us
 */
let buildAndOpenInventory = (event, col, row) => {
	let {item, player} = event
	let total = col * row

	//Fetch a cached- or create- an empty representation of the bag, we will fill this later
	//Sadly Rhino screams if we supply a number as key to Map.computeIfAbsent so we convert to string and then back again
	let EMPTY_GUI = fetchSizedBag(total.toString())

	let container = new JavaAdapter($SC, {
		stillValid: function(player){
			//ensure that we can always open this bag; it is not tied to a location
			//player is still accessible if you do want to create some requirement
			return true;
		},
		setChanged: function(){
			//save the contents from the GUI into the actual held item
			this.bagItem.set($DC.CONTAINER, $ICC.fromItems(this.getItems()));
		},
		canPlaceItem: function(slot, stack){
			//Ensures that we cannot put any bag inside a bag; stops us from putting the bag into itself, thus voiding everything
			return stack.item.id != this.bagItem.item.id;
		}

	}, EMPTY_GUI)

	//VERY important! We must tie the actual held itemstack to the GUI, or we would not be able to read/write between them
	container.bagItem = item

	//retrieve the contents from the held item and put them into the GUI
	let contents = item.getOrDefault($DC.CONTAINER, $ICC.EMPTY)
	contents.copyInto(container.getItems())

	player.openInventoryGUI(container, Component.translatable('container.inventory'), col, row)
}
