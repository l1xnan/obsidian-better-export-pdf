async function print(this){
	(t = this.app.loadProgress).setMessage(tf.dialogue.preparingPdf()),
	t.show(),
	(n = "obsidian" === this.app.vault.getConfig("theme")) && (document.body.addClass("theme-light"),
	document.body.removeClass("theme-dark")),
	document.body.removeClass("theme-dark"),
	i = document.body.createDiv("print"),
	(r = new lf).load(),
	o = function() {
			i.detach(),
			r.unload(),
			n && (document.body.removeClass("theme-light"),
			document.body.addClass("theme-dark")),
			t.hide()
	}
	,
	i.addEventListener("click", o),
}
