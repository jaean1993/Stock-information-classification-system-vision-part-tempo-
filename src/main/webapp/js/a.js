//
// site.js
//
//
(function($){
  // var trace = function(msg){
  //   if (typeof(window)=='undefined' || !window.console) return
  //   var len = arguments.length, args = [];
  //   for (var i=0; i<len; i++) args.push("arguments["+i+"]")
  //   eval("console.log("+args.join(",")+")")
  // }  
  
  var Renderer = function(elt){
    var dom = $(elt)
    var canvas = dom.get(0)//获取elt参数的第一个值
    var ctx = canvas.getContext("2d");//返回一个在画布上绘图的二位环境
    var gfx = arbor.Graphics(canvas)
    var sys = null

    var _vignette = null
    var selected = null
    var   nearest = null
    var   _mouseP = null
    
    var that = {
      init:function(pSystem){
        sys = pSystem
        sys.screen({size:{width:dom.width(), height:dom.height()},
                    padding:[36,60,36,60]})

        $(window).resize(that.resize)//调整窗口大小
        that.resize()
        that._initMouseHandling()
      },
      resize:function(){              //设置画布的大小
        canvas.width = $(window).width()
        canvas.height = .7* $(window).height()
        sys.screen({size:{width:canvas.width, height:canvas.height}})
        _vignette = null
        that.redraw()
      },
      redraw:function(){        //节点绘制
        gfx.clear()
        sys.eachEdge(function(edge, p1, p2){
          if (edge.source.data.alpha * edge.target.data.alpha == 0) return
          if(edge.source.data.tp == edge.target.data.tp)
          gfx.line(p1, p2, {stroke:"#7CCD7C", width:4, alpha:edge.target.data.alpha})
          //gfx.text(node.name, (p1.x+p2.x)/2, (p1.y+p2.y)/2+7, {color:"white", align:"center", font:"Arial", size:20})
          else
          gfx.line(p1, p2, {stroke:"#CD0000", width:2, alpha:edge.target.data.alpha})
          })
        sys.eachNode(function(node, pt){
          var w = Math.max(20, 20+gfx.textWidth(node.name) )
          if (node.data.alpha==0) return
          if (node.data.shape=='dot'&node.data.color=='red'){
            gfx.oval(pt.x-w, pt.y-w, 2*w, 2*w, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(node.data.label, pt.x, pt.y+7, {color:"white", align:"center", font:"Arial", size:20})
             }
          else
          {
        	  if(node.data.shape=='dot')
        		  {
        		  gfx.oval(pt.x-w/2, pt.y-w/2, w, w, {fill:node.data.color, alpha:node.data.alpha})
                  gfx.text(node.name, pt.x, pt.y+7, {color:"white", align:"center", font:"Arial", size:12})
                  }
        	  else
        		  {
        		  gfx.rect(pt.x-w/2, pt.y-8, w, 20, 4, {fill:node.data.color, alpha:node.data.alpha})
                  gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Arial", size:12})
               }
          }
     
        })
        that._drawVignette()
      },
      
      _drawVignette:function(){//设置画布边框属性
        var w = canvas.width
        var h = canvas.height
        var r = 20

        if (!_vignette){
          var top = ctx.createLinearGradient(0,0,0,r)
          top.addColorStop(0, "#e0e0e0")
          //top.addColorStop(0, "black")
          top.addColorStop(0, "rgba(255,255,255,0)")

          var bot = ctx.createLinearGradient(0,h-r,0,h)
          bot.addColorStop(0, "rgba(255,255,255,0)")
          bot.addColorStop(1, "white")

          _vignette = {top:top, bot:bot}
        }
        
        // 上边框属性
        ctx.fillStyle = _vignette.top
        ctx.fillRect(0,0, w,r)

        // 下边框属性
        ctx.fillStyle = _vignette.bot
        ctx.fillRect(0,h-r, w,r)
      },

     switchMode:function(e){ //将不透明度逐渐改变为设定的值
        if (e.mode=='hidden'){
          dom.stop(true).fadeTo(e.dt,0, function(){// 参数1变化速度  参数2透明度0-1 参数3返回执行的函数
            if (sys) sys.stop()
            $(this).hide()
          })
        }else if (e.mode=='visible'){
          dom.stop(true).css('opacity',0).show().fadeTo(e.dt,1,function(){
            that.resize()
          })
          if (sys) sys.start()
        }
      },
      
      switchSection:function(newSection){//设置可见性
        var parent = sys.getEdgesFrom(newSection)[0].source
        var children = $.map(sys.getEdgesFrom(newSection), function(edge){
          return edge.target
        })
        
        sys.eachNode(function(node){
          if (node.data.shape=='dot') return  

          var nowVisible = ($.inArray(node, children)>=0)
          var newAlpha = (nowVisible) ? 1 : 0
          var dt = (nowVisible) ? .5 : .5
          sys.tweenNode(node, dt, {alpha:newAlpha})

          if (newAlpha==1){
            node.p.x = parent.p.x + .05*Math.random() - .025
            node.p.y = parent.p.y + .05*Math.random() - .025
            node.tempMass = .001
          }
        })
      },
      
      
      _initMouseHandling:function(){ //鼠标事件
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;
        var oldmass = 1

        var _section = null
        
        var handler = {
          moved:function(e){
            var pos = $(canvas).offset();//获取偏移值
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = sys.nearest(_mouseP);

            if (!nearest.node) return false

            if (1){
              selected = (nearest.distance < 50) ? nearest : null
              if (selected){ 
            	  dom.addClass('linkable')
                 window.status = selected.node.data.link.replace(/^\//,"http://"+window.location.host+"/").replace(/^#/,'')
              }
              else{
                 dom.removeClass('linkable')
                 window.status = ''
              }
            }else if ($.inArray(nearest.node.name, ['证券','货币证券','资本证券','无价证券','有价证券']) >=0 ){
              if (nearest.node.name!=_section){
                _section = nearest.node.name
                that.switchSection(_section)
              }
              dom.removeClass('linkable')
              window.status = ''
            }
            
            return false
          },
          clicked:function(e){//鼠标点击事件
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = sys.nearest(_mouseP);
            
            if (nearest && selected && nearest.node==selected.node){
              var link = selected.node.data.link
              if (link.match(/^#/)){
                 $(that).trigger({type:"navigate", path:link.substr(1)})
              }else{
                 window.location = link
              }
              return false
            }              
            if (dragged && dragged.node !== null) dragged.node.fixed = true

            $(canvas).unbind('mousemove', handler.moved);
            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){//鼠标拖动事件
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (!nearest) return
            if (dragged !== null && dragged.node !== null){
              var p = sys.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged==null || dragged.node==undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null;
            // selected = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            $(canvas).bind('mousemove', handler.moved);
            _mouseP = null
            return false
          }
        }

        $(canvas).mousedown(handler.clicked);
        $(canvas).mousemove(handler.moved);

      }
    }
    
    return that
  }
  
  
   var Nav = function(elt){
    var dom = $(elt)

    var _path = null
    
    var that = {
      init:function(){
        $(window).bind('popstate',that.navigate)
        dom.find('> a').click(that.back)
        $('.more').one('click',that.more)
        
        $('#资本证券 dl:not(.datastructure) dt').click(that.reveal)
        that.update()
        return that
      },
      more:function(e){
        $(this).removeAttr('href').addClass('less').html('&nbsp;').siblings().fadeIn()
        $(this).next('h2').find('a').one('click', that.less)
        
        return false
      },
      less:function(e){
        var more = $(this).closest('h2').prev('a')
        $(this).closest('h2').prev('a')
        .nextAll().fadeOut(function(){
          $(more).text('creation & use').removeClass('less').attr('href','#')
        })
        $(this).closest('h2').prev('a').one('click',that.more)
        
        return false
      },
      reveal:function(e){
        $(this).next('dd').fadeToggle('fast')
        return false
      },
      back:function(){
        _path = "/"
        if (window.history && window.history.pushState){
          window.history.pushState({path:_path}, "", _path);
        }
        that.update()
        return false
      },
      navigate:function(e){
        var oldpath = _path
        if (e.type=='navigate'){
          _path = e.path
          if (window.history && window.history.pushState){
             window.history.pushState({path:_path}, "", _path);
          }else{
            that.update()
          }
        }else if (e.type=='popstate'){
          var state = e.originalEvent.state || {}
          _path = state.path || window.location.pathname.replace(/^\//,'')
        }
        if (_path != oldpath) that.update()
      },
      update:function(){
        var dt = 'fast'
        if (_path==null){
          //网页原始加载项
          _path = window.location.pathname.replace(/^\//,'')
          dt = 0
          dom.find('p').css('opacity',0).show().fadeTo('slow',1)
        }

        switch (_path){
          case '':
          case '/':
          dom.find('p').text('a graph visualization library using web workers and jQuery')
          dom.find('> a').removeClass('active').attr('href','#')

          $('#资本证券').fadeTo('fast',0, function(){
            $(this).hide()
            $(that).trigger({type:'mode', mode:'visible', dt:dt})
          })
          document.title = "证券"
          break
          
          case '债券':
          case '股票':
          $(that).trigger({type:'mode', mode:'hidden', dt:dt})
          dom.find('> p').text(_path)
          dom.find('> a').addClass('active').attr('href','#')
          $('#资本证券').stop(true).css({opacity:0}).show().delay(333).fadeTo('fast',1)
                    
          $('#资本证券').find(">div").hide()
          $('#资本证券').find('#'+_path).show()
          document.title = "证券 禄 " + _path
          break
        }
        
      }
    }
    return that
  }
  
  $(document).ready(function(){
    var CLR = {
      branch:"#858585",
      or:"orange",
      re:"red",
      gr:"green",
      股票:"green",
      资本证券:"black",
      b:"#8EE5EE"
    }

    var demos = {
      nodes:{
    	     平安银行:{color:CLR.b, shape:"dot", alpha:1,tp:1},    
    	     平安银行进军游戏业打造主题信用卡:{color:CLR.re, alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/b.html'},
    	     建设银行:{color:CLR.or, shape:"dot", alpha:1,tp:1,link:'http://localhost:5858/test/src/main/webapp/e.html'},
    	     兴业银行:{color:CLR.or, shape:"dot", alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/f.html'},
             中国银行:{color:CLR.or, shape:"dot", alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/g.html'},
             
             
上市银行首份三季报中平安银行净利增速大跌:{color:CLR.gr,  alpha:1,tp:1,link:'http://localhost:5858/test/src/main/webapp/c.html'}, 
             中信银行:{color:CLR.or, shape:"dot", alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/h.html'},
             农业银行:{color:CLR.or, shape:"dot", alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/i.html'},
             招商银行:{color:CLR.or, shape:"dot", alpha:1,tp:1,link:'http://localhost:5858/test/src/main/webapp/j.html'},
             
             
畜牧企业超越平安银行温氏股份2000亿市值遭疑:{color:CLR.gr,  alpha:1,tp:1,link:'http://localhost:5858/test/src/main/webapp/d.html'},
             浦发银行:{color:CLR.or, shape:"dot", alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/k.html'},
             交通银行:{color:CLR.or, shape:"dot", alpha:1,tp:1,link:'http://localhost:5858/test/src/main/webapp/l.html'},
             华夏银行:{color:CLR.or, shape:"dot", alpha:1,tp:1,link:'http://localhost:5858/test/src/main/webapp/m.html'},
             工商银行:{color:CLR.or, shape:"dot", alpha:1,tp:0,link:'http://localhost:5858/test/src/main/webapp/n.html'},
            
             
            },
      edges:{
        平安银行:{
          平安银行进军游戏业打造主题信用卡:{length:.8},
          
上市银行首份三季报中平安银行净利增速大跌:{length:.8},
          
畜牧企业超越平安银行温氏股份2000亿市值遭疑:{length:.8},
          
        },
        平安银行进军游戏业打造主题信用卡:{
        	建设银行:{},
        	兴业银行:{},
        	中国银行:{}
        },
        
上市银行首份三季报中平安银行净利增速大跌:{   	   
        	中信银行:{},
        	农业银行:{},
        	招商银行:{},
       },
        
畜牧企业超越平安银行温氏股份2000亿市值遭疑:{
    	   浦发银行:{},
    	   交通银行:{},
    	   华夏银行:{},
    	   工商银行:{},
        },
  
    
      }
    }
    var sys = arbor.ParticleSystem()
    sys.parameters({stiffness:900, repulsion:2000, gravity:true, dt:0.015})
    sys.graft(demos)
    sys.renderer = Renderer("#sitemap")
  
    
    var nav = Nav("#nav")
    $(sys.renderer).bind('navigate', nav.navigate)
    $(nav).bind('mode', sys.renderer.switchMode)
    nav.init()
  })
})(this.jQuery)