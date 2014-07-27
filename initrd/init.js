var key = exec({}, 'keyboard.js', load('/keyboard.js'))

var start = 0xB8000
var bytes = 2
var cols  = 80
var rows  = 25
var size  = cols * rows * bytes

var bu = buff(start, size)
var b  = new Uint16Array(bu)

for(var i=0; i<b.length; i++){
  b[i] = 0
}

// http://wiki.osdev.org/Text_UI
var header = load('/banner.txt').split('\n')

var y = 0
var hx = 0x0C << 8

header.forEach(function(line){
  for(var i=0; i<line.length; i++)
    b[i + y*80] = hx | line.charCodeAt(i)
  y++
})

function Screen(buffer){
  this.buffer = buffer
  this.bytes  = 2
  this.cols   = 80
  this.rows   = 25
  this.color  = 0x0A
  //             row, col
  this.cursor = [ 0 ,  0 ]
}

Screen.prototype.clear = function(){
  var b = this.buffer
  for(var i=0; i<b.length; i++){
    b[i] = 0
  }
}

Screen.prototype.nextChar = function() {
  var row = this.cursor[0]
  var col = this.cursor[1]

  if (row === this.rows) {
    this.cursor[0] = row + 1
    this.cursor[1] = 0
  } else {
    this.cursor[1] = col + 1
  }
}

Screen.prototype.linearChar = function () {
  return this.cursor[0] * this.cols + this.cursor[1]
}

Screen.prototype.returnChar = function () {
  this.cursor[0]++
  this.cursor[1] = 0
}

Screen.prototype.returnOrClear = function (){
  if (this.cursor[0] >= this.rows - 1) {
    this.clear()
    this.startChar()
    this.cursor[0] = 0
  } else {
    this.returnChar()
  }
}

Screen.prototype.startChar = function(){
  this.cursor[1] = 0
}

Screen.prototype.writeChar = function (c) {
  var pos = this.linearChar()
  this.buffer[pos] = this.color << 8 | c.charCodeAt(0)
  this.nextChar()
}

Screen.prototype.write = function (line) {
  for(var i=0; i<line.length; i++) {
    var char = line[i]
    if (char === '\n') {
      this.returnOrClear()
    } else {
      this.writeChar(char)
    }
  }
}

var screen = new Screen(b)

screen.cursor = [10, 0]

var i = 0
function prompt() {
  screen.returnOrClear()
  screen.write("runtime > ")
}

screen.write("Welcome to Runtime")
prompt()

var timeouts = []
function setTimeout(func,ival) {
  timeouts.push({
    func: func,
    ival: ival * 10
  })
}

var buff = []

// this is our event loop
while(true) {

  // handle setTimeout
  timeouts.forEach(function(item){
    if (item.ival-- > 0) return

    var cb = item.func
    timeouts.splice(timeouts.indexOf(item), 1)
    cb()
  })

  // keyboard push
  if(1 === poll()) {

    // map key number to ascii
    var c = key(inb(0x60))

    if (c === '\n') {
      screen.returnOrClear()
      try {
        screen.write((eval(buff.join('')) || '[undefined]').toString())
      } catch (e) {
        screen.write(e.toString())
      }
      buff = []
      prompt()
    } else if (c) {
      screen.write(c)
      buff.push(c)
    }
  }
}