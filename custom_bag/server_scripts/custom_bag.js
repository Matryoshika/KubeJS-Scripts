let $SC = Java.loadClass('net.minecraft.world.SimpleContainer')
let $DC = Java.loadClass('net.minecraft.core.component.DataComponents')
let $ICC = Java.loadClass('net.minecraft.world.item.component.ItemContainerContents')
ItemEvents.rightClicked('minecraft:stick', event => {
	let {item, player} = event

	//how many slots wide the bag should be
	let col = 9
	//how many slots tall the bag should be
	let row = 5
	let total = col * row
	
	//Create an empty representation of the bag, we will fill this later
	let EMPTY_GUI = [];
	let size = (total - EMPTY_GUI.length)
	for(let i = 0; i < size; i++)
		EMPTY_GUI.push(Item.of('minecraft:air'))

	let container = new JavaAdapter($SC, {
		stillValid: function(player){
			//ensure that we can always open this bag; it is not tied to a location
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
	contents.copyInto (container.getItems())
	
	
	player.openInventoryGUI(container, Component.translatable('container.inventory'), col, row)
})
