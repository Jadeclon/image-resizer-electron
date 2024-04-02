const path = require('path')
const os = require('os')
const fs = require('fs')
const resizeImg = require('resize-img')
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')

process.env.NODE_ENV = 'production'

const isDev = process.env.NODE_ENV !== 'production'
const isMac = process.platform === 'darwin'

let mainWindow

// Create the main window
function createMainWindow() {
	mainWindow = new BrowserWindow({
		title: 'Image Resizer',
		width: isDev ? 1000 : 500,
		height: 600,
		webPreferences: {
			// Since we*re using node modules,
			// you have to set also these two vars to true:
			nodeIntegration: true,
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js'),
		},
	})

	// Open devtools
	if (isDev) {
		mainWindow.webContents.openDevTools()
	}

	mainWindow.loadFile(path.join(__dirname, './renderer/index.html'))

	console.log('Electron App is running')
}

// Create about window
function createAboutWindow() {
	const aboutWindow = new BrowserWindow({
		title: 'About Image Resizer',
		width: isDev ? 1000 : 500,
		height: 600,
	})

	aboutWindow.loadFile(path.join(__dirname, './renderer/about.html'))
}

// App is ready
app.whenReady().then(() => {
	createMainWindow()

	// Implement menu
	const mainMenu = Menu.buildFromTemplate(menuTemplate)
	Menu.setApplicationMenu(mainMenu)

	// Remove mainWindow from memory on close
	mainWindow.on('closed', () => {
		mainWindow = null
	})

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createMainWindow()
		}
	})
})

// Menu template
const menuTemplate = [
	...(isMac
		? [
				{
					label: app.name,
					submenu: [
						{
							label: 'About',
							click: createAboutWindow,
						},
					],
				},
		  ]
		: []),
	{
		role: 'fileMenu',
	},
	...(!isMac
		? [
				{
					label: 'Help',
					submenu: [
						{
							label: 'About',
							click: createAboutWindow,
						},
					],
				},
		  ]
		: []),
]

// Respond to ipcRenderer resize
ipcMain.on('image:resize', (event, options) => {
	options.dest = path.join(os.homedir(), 'imageresizer')
	resizeImage(options)
})

// Resize the image
async function resizeImage({ imgPath, width, height, dest }) {
	try {
		//function comes from the resize-img library
		const newPath = await resizeImg(fs.readFileSync(imgPath), {
			width: +width,
			height: +height,
		})

		const filename = path.basename(imgPath)
		// const filename = path.basename(imgPath.join('_resized'))

		// Create destination folder if not exists
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest)
		}

		// Write file to dest folder
		fs.writeFileSync(path.join(dest, filename), newPath)

		// Send success message to renderer
		mainWindow.webContents.send('image:done')

		// Open dest folder
		shell.openPath(dest)
	} catch (error) {
		console.log(error)
	}
}

app.on('window-all-closed', () => {
	if (!isMac) {
		app.quit()
	}
})
