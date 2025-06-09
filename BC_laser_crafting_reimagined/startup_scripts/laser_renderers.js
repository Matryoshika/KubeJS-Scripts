//requires: KubeJS Client
//requires: renderjs
//reguires: custommachinery

/* ^ first line ensures that this rendering script is only loaded when on the client!
* Very bad juju if client-side code is even referenced on the server, but we have to put this in startup because `ClientEvents.blockEntityRendererRegistry` is startup_script only. Cause logic
* we also require the mods RenderJS and CustomMachinery. The latter is just for the $CMRenderer.THICK_LINES. Can be safely switched to the vanilla $RenderType.LINES
*/ 

let $RenderSystem = Java.loadClass('com.mojang.blaze3d.systems.RenderSystem')
let $Vec3d = Java.loadClass('net.minecraft.world.phys.Vec3')
let $RenderType = Java.loadClass('net.minecraft.client.renderer.RenderType')
let $Font = Java.loadClass('net.minecraft.client.gui.Font')
let $CMRenderer = Java.loadClass('fr.frinn.custommachinery.client.RenderTypes')
let $BlockItem = Java.loadClass('net.minecraft.world.item.BlockItem')
let $Color = Java.loadClass('java.awt.Color')

ClientEvents.blockEntityRendererRegistry(event => {
    event.register("project_unknown:laser_crafting_table", (c) => RenderJSBlockEntityRenderer
        .create(c)
        .setShouldRenderOffScreen(b => false)
        .setCustomRender((renderer, context) => {
			laser_table_renderer(renderer, context)
        })
    )
	event.register("project_unknown:laser", (c) => RenderJSBlockEntityRenderer
        .create(c)
        .setShouldRenderOffScreen(b => false)
        .setCustomRender((renderer, context) => {
			laser_renderer(renderer, context)
        })
    )
})

// These strings are shortcut references to the exact same strings used in server_scripts/lasercrafting.js
let LCT = 'project_unknown:laser_crafting_table_location'
let LRC = 'project_unknown:laser_randomized_colour'
let LIA = 'project_unknown:laser_is_active'
let TIC = 'project_unknown:table_is_crafting'
let RME = 'project_unknown:laser_recipe_max_energy'
let RCE = 'project_unknown:laser_recipe_current_energy'
let CRI = 'project_unknown:laser_recipe_current_recipe_by_input'

// Creating a new Itemstack every frame is a baaaad idea, so let's create a cache and only create an itemstack once and get it when needed
let itemstack_cache = new $HashMap()
let getI = (id) => {
    return itemstack_cache.computeIfAbsent(id, key => Item.of(key))
}

/** 
 * When creating your own BlockEntity renderer, dont create a basic function, but rather use global.functionname = (renderer, context) => {}
 * Reloading will not work as this is a startup script, so once it's registerred, that's it, eeeexcept global.functionX are janky special cases, and can be reloaded
 * Also ensure to put ALL your code in a try-catch. The smallest little error and you will crash
 * Change to regular function and remove the try-catch once you are done and got a working renderer
*/
let laser_table_renderer = (renderer, context) => {
    //get the blockentity and it's data from the context
	let be = context.blockEntity
	let data = be.getPersistentData()
	
    //Ensure data is available and act on it if it is
	if(data.contains(TIC) && data.getBoolean(TIC) && data.contains(CRI) && data.getString(CRI) != 'minecraft:air'){

        //PoseStack is our access to the rendering space
		var poseStack = context.poseStack
		let energy_text = `${data.getInt(RCE)} / ${data.getInt(RME)}`

        //By default, when rendering text, it's going to be HUUUUGE. 0.005 is used to scale down the text in function: cleanerTextRenderer
        //So we gotta use the same scale here if we want to know the proper width of the text, so that we can center it properly on the table later
		let txtw = Client.font['width(java.lang.String)'](energy_text) * 0.005

        //i is used as an index and the text is rotated by 90xi degrees
        //the 2147483647 is the lightlevel, from 0-max_int, but honestly has very little effect on the text in most conditions
        //cleanerTextRenderer pushes and pops by itself. Its code could have been left in here but letting it be its own function makes it a bit neater
		for(let i = 1; i < 5; i++)
			cleanerTextRenderer(i, energy_text, txtw, context, 2147483647)
		

        //Push a new pose to render the recipe input
		poseStack.pushPose()
        let item = getI(data.getString(CRI))
		let offset = item instanceof $BlockItem ? 0.175 : 0.15	
		poseStack.translate(0.5, 0.875, 0.5 - offset)
		context.rotationDegreesX(90)
		Client.getItemRenderer().renderStatic(item, "ground", 2147483647, context.packedOverlay, poseStack, context.bufferSource, context.blockEntityJS.level, 0)
		poseStack.popPose()
        //ALWAYS pop a pose after you are done. This reverts any changes in the OpenGL space and leaves it neat and tidy without graphical artifacts

        //Push a new pose and render the progress bar(s)
		poseStack.pushPose()
		let start = 0.2
		let range = 0.8 - start
		let progress = start + ((data.getInt(RCE) / data.getInt(RME)) * range)
		let barb = 0.99 //bar-background colour
		laserProgressBar(context.getBufferSource().getBuffer($RenderType.LINES), context.poseStack, 0.2, 0.879, 0.8, 0.8, 0.879, 0.8, barb,barb,barb,0.75)
		laserProgressBar(context.getBufferSource().getBuffer($CMRenderer.THICK_LINES), context.poseStack, 0.2, 0.88, 0.8, progress, 0.88, 0.8, 1,0,0,0.5)

		laserProgressBar(context.getBufferSource().getBuffer($RenderType.LINES), context.poseStack, 0.8, 0.879, 0.2, 0.2, 0.879, 0.2, barb,barb,barb,0.75)
		laserProgressBar(context.getBufferSource().getBuffer($CMRenderer.THICK_LINES), context.poseStack, 0.8, 0.88, 0.2, 1-progress, 0.88, 0.2, 1,0,0,0.5)

		laserProgressBar(context.getBufferSource().getBuffer($RenderType.LINES), context.poseStack, 0.8, 0.879, 0.2, 0.8, 0.879, 0.8, barb,barb,barb,0.75)
		laserProgressBar(context.getBufferSource().getBuffer($CMRenderer.THICK_LINES), context.poseStack, 0.8, 0.88, 1-progress, 0.8, 0.88, 0.8, 1,0,0,0.5)

		laserProgressBar(context.getBufferSource().getBuffer($RenderType.LINES), context.poseStack, 0.2, 0.879, 0.2, 0.2, 0.879, 0.8, barb,barb,barb,0.75)
		laserProgressBar(context.getBufferSource().getBuffer($CMRenderer.THICK_LINES), context.poseStack, 0.2, 0.88, 0.2, 0.2, 0.88, progress, 1,0,0,0.5)
		poseStack.popPose()
	}
}

/** 
 * Renders a line from point [x0,y0,z0] to [x1,y1,z1] with RGBA of [c1,c2,c3,ca]
*/
let laserProgressBar = (buffer, ps, x0, y0, z0, x1, y1, z1, c1,c2,c3,ca) => {
	let transform = ps.last().pose()
	let normalized = new $Vec3d(x1 - x0, y1 - y0, z1 - z0).normalize()
	buffer.addVertex(transform, x0, y0, z0).setColor(c1, c2, c3, ca).setNormal(normalized.x, normalized.y, normalized.z).setUv(0, 0)
	buffer.addVertex(transform, x1, y1, z1).setColor(c1, c2, c3, ca).setNormal(normalized.x, normalized.y, normalized.z).setUv(0, 0)
}

/** 
 * Renders text in the world
 * By default, text will be HUGE. A single letter will be ~6 blocks tall
*/
let cleanerTextRenderer = (count, txt, txtw, context, lightLevel) => {
    //The laser table renders text on each 4 sides on it's top face. This calculates the x & z, where 0 is the start of the blockpos and 1 is the end of it
	let xpos = count == 1 ? 0.5 - (txtw / 2) : count == 2 ? 0.175 : count == 3 ? 0.5 + (txtw / 2) : 0.825
	let zpos = count == 1 ? 0.825 : count == 2 ? 0.5 - (txtw / 2) : count == 3 ? 0.175 : 0.5 + (txtw / 2)

	context.poseStack.pushPose()
	context.poseStack.translate(xpos, 0.875, zpos)
	context.scale(0.005, 0.005, 0.005)
	context.rotationDegreesX(90)
	context.rotationDegreesZ(-90 + 90 * count)

    //WHOA what's happening here?
    //Client.font has *2* overloaded methods, one taking a string, and one taking a TextComponent. Doesn't really matter for us, but KubeJS will cry about ambiguous methods
    //So we use object['function(variable-declarations)'](vars) to bypass the ambiguous methods and specify 1 of them... When theres a lot of vars with long pckg names, it can get a bit messy
	Client.font["drawInBatch(net.minecraft.network.chat.Component,float,float,int,boolean,org.joml.Matrix4f,net.minecraft.client.renderer.MultiBufferSource,net.minecraft.client.gui.Font$DisplayMode,int,int)"](
		txt, 0, 0, 0xFFFFFF, false, context.poseStack.last().pose(), context.bufferSource, $Font.DisplayMode.NORMAL, 0xFFFFFF, lightLevel)
	context.poseStack.popPose()
}

/** 
 * This renders the actual "light" beams from a laser towards a nearby table
*/
let laser_renderer = (renderer, context) => {
	let be = context.blockEntity
	let data = be.getPersistentData()
	if(data.contains(LIA) && data.getBoolean(LIA) == true && data.contains(LCT)){
		let pos = data.getIntArray(LCT)

        //if the saved position is a placeholder when table does not exist, then do not render
		if(pos[0] == 0 && pos[1] == -1 && pos[2] == 1)
			return

        //gets the blockpos this current laser that is supposed to fire the beam
		let ownpos = context.blockEntityJS.blockPos.getCenter()
		context.poseStack.pushPose()
		let buffer = context.getBufferSource().getBuffer($RenderType.LINES)
        //Have to translate(move) the rendering position to negative it's own coordinates, as client counts 0,0,0 at the Player's position
		context.poseStack.translate(-ownpos.x, -ownpos.y, -ownpos.z)
		renderLaser(buffer, context.poseStack, context.blockEntityJS.blockPos.asLong(), ownpos.x+0.5, ownpos.y, ownpos.z+0.5, pos[0]+1, pos[1]+1.25, pos[2]+1)
		context.poseStack.popPose()
	}
}

/**
 * Render a laser from point [x0,y0,z0] to point [x1,y1,z1]
 */
let renderLaser = (buffer, ps, offset, x0, y0, z0, x1, y1, z1) => {
	let transform = ps.last().pose()
	let normalized = new $Vec3d(x1 - x0, y1 - y0, z1 - z0).normalize()
	let rest = offset % 6
	let time = ((((Utils.getSystemTime()+offset)/20) % 360) / 360.0)    //We use the system time plus the laser's blockpos as an offset, and generate a value in a 360 based spectrum
    //generate a pseudo-random target offset for the end-point of the laser, allowing each laser to be close to the center of the table's top-face
	let ownOffset = Math.sin(time) * 0.04
	if(rest == 0)
		x1 += ownOffset
	if(rest == 1)
		z1 += ownOffset
	if(rest == 2){
		x1 += ownOffset
		z1 += ownOffset
	}
	if(rest == 3){
		x1 -= ownOffset
		z1 += ownOffset
	}
	if(rest == 4){
		x1 += ownOffset
		z1 -= ownOffset
	}
	if(rest == 5){
		x1 -= ownOffset
		z1 -= ownOffset
	}
    //Generate a new colour based off of the time variable from earlier, which is offset by laser's location, making sure that each laser is at least slightly different in colour
	let col = new $Color($Color.getHSBColor(time, 1, 1).getRGB())
	buffer.addVertex(transform, x0, y0, z0).setColor(col.getRed() / 255.0, col.getGreen() / 255.0, col.getBlue() / 255.0, 10.0).setNormal(normalized.x, normalized.y, normalized.z).setUv(0, 0)
	buffer.addVertex(transform, x1, y1, z1).setColor(col.getRed() / 255.0, col.getGreen() / 255.0, col.getBlue() / 255.0, 10.0).setNormal(normalized.x, normalized.y, normalized.z).setUv(1, 1)
}