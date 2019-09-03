const argv=require("yargs").alias('p',"port").describe("p","specify the listen port").alias("a","auth").describe("a","specify basic auth in user:pass format").argv;
const express=require("express")
const cp=require('child_pty')
const servestatic=require("serve-static")
var port=process.env.PORT ||3000;
if(argv.port) port=argv.port
var app=express()
if(argv.auth)
{
	var users={};
	if(Array.isArray(argv.auth))
	{
		for(var i=0;i<argv.auth.length;i++)
		{
			var chunks=argv.auth[i].split(":");
			users[chunks.shift()]=chunks.join(":");
		}
	}
	else
	{
		var chunks=argv.auth.split(":")
		users[chunks.shift()]=chunks.join(":");
	}
	const bauth=require("express-basic-auth");
	app.use(bauth({
		users:users,
		challenge:true,
		realm:"webterminal"
		}));
}
var http=require("http").createServer(app);
var io=require("socket.io")(http);
var p=cp.spawn("bash",[],{name:"xterm-color",columns:80,rows:25})
console.log(` process id ${p.pid}`)
p.stdout.on('resize', function() {
    console.log('New columns: ' + this.columns);
    console.log('New rows:    ' + this.rows);
})
p.on("exit",(num,sig) => {
	console.log("process exit");
})
p.stdout.on("data",(data)=> {
        io.emit("chat message",data.toString("binary"));
});

p.stderr.on("data",(data)=> {
        io.emit("chat message",data.toString());
});
app.use(servestatic("./"))
app.get("/",(req,res) => {
        res.sendFile(__dirname+"/index.html");
        });

io.on("connection", (socket) => {
        console.log("a user logon");
	socket.emit("chat message","Welcome to here\r\n>")
        socket.on("disconnect",() => {
                console.log("user disconnected");
                });
        socket.on("chat message",function(m) {
                //console.log("message: "+m);
                p.stdin.write(m);
                });
        });
http.listen(port,"0.0.0.0",() => {
        console.log("listen on "+port);
        });
