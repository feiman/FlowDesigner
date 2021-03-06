/**
 * 流程图编辑器
 * 本js程序依赖于以下程序：
 * jQuery.js
 * dragController.js
 */
/*
 * 定义业务对象
 */
/**
 * 基类的构造函数
 * @param obj
 * @returns
 */
var BussinessObj = function(obj){
	this.model={};
	if(obj && obj instanceof Object){
		this.model=obj.model;
		console.log("obj.model.displayName:"+obj.model.displayName);
	}
	this.view={};
	if(obj && obj instanceof Object){
		this.view=obj.view;
	}
}

/**
 * 子类，Activity
 */
var Act = function(obj){
	var defaultModel = {
		"listNo":0,/*排序号*/
		"activityType":'01',
		"activityBz":'0',
		"authority":'0'
	}
	obj.model = $.extend(defaultModel,obj.model);
	BussinessObj.call(this,obj);
};
Act.prototype = new BussinessObj();

/**
 * 子类，操作选项
 */
var Oper = function(obj){
	var defaultModel = {
		"listNo":0,/*排序号*/
		"deadlineType":'1',
		"deadlineTime":'00:00:00'
	}
	obj.model = $.extend(defaultModel,obj.model);
	BussinessObj.call(this,obj);
	//在业务对象的上方（30个像素处）增加一个控制点。(控制点以图形的中心为准)
	var x = this.view.x +Math.floor((icons['oper'].width)/2);
	var heightOfMouse = icons['mouse'].height;//鼠标图形的高度
	var y = this.view.y-30+Math.floor(heightOfMouse/2);// 鼠标图形高度的一半。
	var controlPoint = new ControlPoint(x,y);
	controlPoint.parent = this;//父对象就是其业务对象。
	controlPoint.parentType = 'result';
	this.view.controlPoint = controlPoint;
};
Oper.prototype = new BussinessObj();

/**
 * 子类，后续线
 */
var Subsequent = function(obj){
	var defaultModel = {
		"sortNumber":0,/*排序号*/
		"sequence":'0',
		"postDisplay":'1',
		"postDefault":''
	}
	obj.model = $.extend(defaultModel,obj.model);
	BussinessObj.call(this,obj);
	//有两个控制点，一个是controlPoint，一个是controlPoint1
	//在业务对象的上方（30个像素处）增加一个控制点。(控制点以图形的中心为准)
	var x = this.view.x +Math.floor((icons['subseq'].width)/2);
	var heightOfMouse = icons['mouse'].height;//鼠标图形的高度
	var y = this.view.y-30+Math.floor(heightOfMouse/2);// 鼠标图形高度的一半。
	var controlPoint = new ControlPoint(x,y);
	controlPoint.parent = this;//父对象就是其业务对象。
	controlPoint.parentType = 'result';
	this.view.controlPoint=controlPoint;
	//在业务对象的下方（30个像素处）增加一个控制点。
	var x = this.view.x +Math.floor((icons['subseq'].width)/2);
	var y = this.view.y+30+Math.floor(heightOfMouse/2);// 鼠标图形高度的一半。
	var controlPoint = new ControlPoint(x,y);
	controlPoint.parent = this;//父对象就是其业务对象。
	controlPoint.parentType = 'result';
	this.view.controlPoint1=controlPoint;
}
Subsequent.prototype = new BussinessObj();

/**
 * 一个坐标点
 */
var Point = function(x,y){
	this.x = 0;
	this.y = 0;
	if(x)
		this.x=x;
	if(y)
		this.y=y;
}
/**
 * 控制点（业务对象上可以被鼠标拖动的点）
 */
var ControlPoint = function(x,y){
	Point.call(this,x,y);
}
ControlPoint.prototype = new Point();

/**
 * 绘图过程中要使用到的图片(图标)
 */
var icons = (function(){
	//活动图片.
	var actImg = new Image();
	actImg.src='imgs/design/anyone.gif';
	actImg.width = 28;//这里未必是图片真实的宽度，因图片上有可能有空白的边。
	actImg.height = 36;//这里未必是图片真实的高度，因图片上有可能有空白的边。
	//图片结果图片
	var operImg = new Image();
	operImg.src='imgs/design/Blue Ball16.png';
	operImg.width = 16;
	operImg.height = 16;
	//控制点图片
	var mouseImg = new Image();
	mouseImg.src='imgs/design/mouse_add.png';
	mouseImg.width = 16;
	mouseImg.height = 16;
	//后续线图片（没有图片，是直接在画布上画的圆圈）
	var subseqImg = new Image();
	subseqImg.width = 16;
	subseqImg.height = 16;
	return {
		"act":actImg,
		"oper":operImg,
		"mouse":mouseImg,
		"subseq":subseqImg
	}
	
	
})();

/**
 * 图形绘制器
 * @param canvasId 页面上的画布元素
 * @options 配置项.
 * @returns
 */
function FlRenderer(canvasId,options){
	options = options || {};
	
	/**
	 * 模型
	 */
	var flowModle = {
		  activities:[],/*活动*/
		  operations:[],/*操作结果*/
		  subsequents:[] /*操作结果*/
	};
	
	var originPoint = {x:0,y:0};//坐标系原点在画布上的位置 
	
	/*
	 * 选中的对象 
	 */
	var selected = [];
	var redMarked = null;//标红的对象
	 
	var c = null;//画布元素.
	
	var maxDisplayindex = 0 ;//displayindex从0开始编号
	
	/**拖动模式：normal-正常模式，moving-移动模式（调整坐标系时）  */
	//var dragMode = 'normal';
	
	c = document.getElementById(canvasId);
	var cxt = c.getContext("2d"); //绘图上下文.
	
	/**
	 * 选中一个业务对象后需要触发的事件
	 */
	var onSelect = function(bizObj){/*空函数*/};
	
	if(typeof(options.onSelect)=='function'){
		onSelect = options.onSelect;
	}
	
	//init();
	drawAll(cxt);
	
	var isMouseDown = false;//鼠标左键是否按下
	//鼠标拖动控制器，暂时不设定，等后面再设定.
	var defualtDragCtrl = null;//getDefaultDragCtrl(this);
	var dragCtrl = null;//defualtDragCtrl;
	
	//监听事件onclick
	$(c).click(function(){
		//获取鼠标的坐标（相对于画布的位置）。
		var cursorPos = getCursorPos(event,c);
		var x = cursorPos.x;
        var y = cursorPos.y;
        //console.log("x:"+x+" y:"+y );
        //看看鼠标落在哪个对象上。
        selected = [];
        var obj = selectObj(x,y);
        if(obj && obj instanceof BussinessObj){
        	selected.push(obj);
        }
        drawAll(cxt);
        if(selected.length>0){
        	//TODO obj 应当深拷贝后再传出去的。
        	onSelect(obj);
        }else{
        	onSelect(null);
        }
	});
	
	//监听鼠标移动事件
	$(c).mousemove(function(){
		if(!isMouseDown)
			return;
		//获取鼠标的坐标（相对于原点的位置）。
		var cursorPos = getCursorPos(event,c);
		//鼠标当前位置，（相对于画布的位置）。
		var absPos = getCursorAbsPos(event,c);
        //console.log("x:"+cursorPos.x+" y:"+cursorPos.y );
        if(preDragPos==null || preDragAbsPos == null){
        	preDragPos = cursorPos;
        	preDragAbsPos = absPos;
        }
        thisDragePos = cursorPos;
        thisAbsPos = absPos;
        dragCtrl.onDrag(dragedObj,preDragPos,thisDragePos,preDragAbsPos,thisAbsPos);
    	drawAll(cxt);
        preDragPos = thisDragePos;
        preDragAbsPos = thisAbsPos;
	});
	
	var dragedObj = null;//被拖动的对象
	var preDragPos = null;//上次拖动的坐标（相对于原点）
	var preDragAbsPos = null;//上次拖动的坐标（相对于画布）

	//监听鼠标左键按下事件
	$(c).mousedown(function(){
		if(event.button == 0){//为0表示左键
			isMouseDown = true;
			//获取鼠标的当前位置
			var cursorPos = getCursorPos(event,c);
			var absPos = getCursorAbsPos(event,c);
		    //看看有没有controlPoint被选中
			var obj = selectObj(cursorPos.x,cursorPos.y);
			if(obj){
				//console.log("onStartDrag obj:"+obj);
				dragedObj = obj;
				preDragPos = cursorPos;//getCursorPos(event,c);
				preDragAbsPos = absPos;
				dragCtrl.onStartDrag(obj);
			}
		}
	});
	//监听鼠标左键释放事件
	$(c).mouseup(function(){
		if(event.button == 0){
		    isMouseDown = false;
		    //有可能是拖动结束
		    if(preDragPos!=null){
		    	//拖动结束
		    	dragCtrl.onEndDrag(dragedObj);
		    	preDragPos = null;
		    	preDragAbsPos = null;
		    	dragedObj = null;
		    }
		    redMarked = null;
		}
	});
	
	/**清空选中*/
	function _clearSelected(){
		selected=[];
		//需要触发onSelect事件,放在另一个线程中执行
		setTimeout(function(){onSelect(null);},0);
	}
	
	/**
	 * 根据鼠标所选中的位置，判断哪个控件被选中了。
	 */
	function selectObj(x,y){
		for(var i in flowModle.activities){
        	view = flowModle.activities[i].view;
        	//console.log("view.x:"+view.x+" view.y:"+view.y + "   x:"+x+" y:"+y );
        	if(view.x<x && x<view.x+view.width 
        			&& view.y<y && y<view.y+view.height){
        		console.log("selected!"+selected.length);
        		return flowModle.activities[i];
        	}
        }
        for(var i in flowModle.subsequents){
        	view = flowModle.subsequents[i].view;
        	//console.log("view.x:"+view.x+" view.y:"+view.y );
        	if(view.x<x && x<view.x+view.width 
        			&& view.y<y && y<view.y+view.height){
        		//console.log("selected!"+selected.length);
        		return flowModle.subsequents[i];
        	}
        }
        for(var i in flowModle.operations){
        	view = flowModle.operations[i].view;
        	//console.log("view.x:"+view.x+" view.y:"+view.y );
        	if(view.x<x && x<view.x+view.width 
        			&& view.y<y && y<view.y+view.height){
        		//console.log("selected!"+selected.length);
        		return flowModle.operations[i];
        	}
        }
        //看看有没有controlPoint被选中
	    for(var i in flowModle.operations){
	    	var controlPoint = flowModle.operations[i].view.controlPoint;
	    	if(!controlPoint)
	    		continue;
    	    //console.log("controlPoint.x:"+controlPoint.x+" controlPoint.y:"+controlPoint.y );
    	    var halfWidth = Math.floor(icons['mouse'].width/2);//控制点宽度的一半
    	    var halfHeight = Math.floor(icons['mouse'].height/2);//控制点高度的一半
    	    if(controlPoint.x-halfWidth<x && x<controlPoint.x+halfWidth
        			&& controlPoint.y-halfHeight<y && y<controlPoint.y+halfHeight){
    	    	return controlPoint;
    	    }
	    }
	    for(var i in flowModle.subsequents){
	    	var controlPoint = flowModle.subsequents[i].view.controlPoint;
	    	if (controlPoint){
		    	//console.log("controlPoint.x:"+controlPoint.x+" controlPoint.y:"+controlPoint.y );
		    	var halfWidth = Math.floor(icons['mouse'].width/2);//控制点宽度的一半
	    	    var halfHeight = Math.floor(icons['mouse'].height/2);//控制点高度的一半
	    	    if(controlPoint.x-halfWidth<x && x<controlPoint.x+halfWidth
	        			&& controlPoint.y-halfHeight<y && y<controlPoint.y+halfHeight){
	    	    	return controlPoint;
	    	    }
	    	}
    	    var controlPoint = flowModle.subsequents[i].view.controlPoint1;
    	    if (controlPoint){
		    	//console.log("controlPoint.x:"+controlPoint.x+" controlPoint.y:"+controlPoint.y );
		    	var halfWidth = Math.floor(icons['mouse'].width/2);//控制点宽度的一半
	    	    var halfHeight = Math.floor(icons['mouse'].height/2);//控制点高度的一半
	    	    if(controlPoint.x-halfWidth<x && x<controlPoint.x+halfWidth
	        			&& controlPoint.y-halfHeight<y && y<controlPoint.y+halfHeight){
	    	    	return controlPoint;
	    	    }
    	    }
	    }
	    return null;
	}
	
	/**
	 * 从流程模型中按activityId选择一个活动。
	 */
	function selectActByActId(activityId){
		for(var i in flowModle.activities){
			if(flowModle.activities[i].model.activityId == activityId){
				return flowModle.activities[i];
			}
		}
		return null;
	}
	/**
	 * 从流程模型中按operationId选择一个结果。
	 */
	function selectOperByOperId(operationId){
		for(var i in flowModle.operations){
			if(flowModle.operations[i].model.operationId == operationId){
				return flowModle.operations[i];
			}
		}
		return null;
	}
	/**
	 * 从流程模型中按activityId选择一个结果。
	 */
	function selectOpersByActId(activityId){
		var retOpers = [];
		for(var i in flowModle.operations){
			if(flowModle.operations[i].model.activityId == activityId){
				retOpers.push(flowModle.operations[i]);
			}
		}
		return retOpers;
	}
	
	/**
	 * 从流程模型中按activityId选择一个后续线。
	 */
	function selectSubseqByActId(activityId){
		var subseqs = [];
		for(var i in flowModle.subsequents){
			if(flowModle.subsequents[i].model.activityId == activityId){
				subseqs.push(flowModle.subsequents[i]);
			}
		}
		return subseqs;
	}
	
	/**
	 * 从流程模型中按operationId选择一个后续线。
	 */
	function selectSubseqByOperId(operationId){
		var subseqs = [];
		for(var i in flowModle.subsequents){
			if(flowModle.subsequents[i].model.operationId == operationId){
				subseqs.push(flowModle.subsequents[i]);
			}
		}
		return subseqs;
	}
	
	/**绘制整个图像*/
	function drawAll(cxt){
		cxt.clearRect(0,0,c.width,c.height);
		cxt.save();
		//移动坐标系
		cxt.translate(-originPoint.x,-originPoint.y);
		drawBackground(cxt,0+originPoint.x,0+originPoint.y,c.width+originPoint.x,c.height+originPoint.y);
		for(var i in flowModle.activities){
			drawBizLine(cxt,flowModle.activities[i]);
		}
		for(var i in flowModle.operations){
			drawBizLine(cxt,flowModle.operations[i]);
		}
		for(var i in flowModle.subsequents){
			drawBizLine(cxt,flowModle.subsequents[i]);
		}
		for(var i in flowModle.activities){
			drawBizObj(cxt,flowModle.activities[i]);
		}
		for(var i in flowModle.operations){
			drawBizObj(cxt,flowModle.operations[i]);
		}
		for(var i in flowModle.subsequents){
			drawBizObj(cxt,flowModle.subsequents[i]);
		}
		drawSelect(cxt);
		drawReadMarked(cxt);
		cxt.restore();
	}
	
	/**
	 * 绘制背景
	 */
	function drawBackground(ctx,x1,y1,x2,y2){
		var lg = ctx.createLinearGradient(0,y1,0,y2);//创建一个渐变色
		lg.addColorStop(0,"white");
		lg.addColorStop(1,"#ddd");
		ctx.fillStyle = lg;
		ctx.beginPath();
		ctx.rect(x1,y1,x2-x1,y2-y1);
		ctx.fill();
		//每500个像素画一道维线
		var y=-0.5;
		while(y>y1){
			y-=500;
		}
		y+=500
		while(y<=y2){
			if(y<y1){
				y+=500;
				continue;
			}
			ctx.beginPath();
			cxt.lineWidth=0.5;
			cxt.strokeStyle='black';
			ctx.moveTo(x1,y);
			cxt.lineTo(x2,y);
			cxt.stroke();
			y+=500;
		}
		//每500个像素画一道经线
		
		var x=-0.5;
		while(x>x1){
			x-=500;
		}
		x+=500
		while(x<=x2){
			if(x<x1){
				x+=500;
				continue;
			}
			ctx.beginPath();
			cxt.lineWidth=0.5;
			cxt.strokeStyle='black';
			ctx.moveTo(x,y1);
			cxt.lineTo(x,y2);
			cxt.stroke();
			x+=500;
		}
		
	}
	
	/**
	 * 绘制业务对象中的线条
	 */
	function drawBizLine(cxt,obj){
		if(obj instanceof Act){
			drawActivityLine(cxt,obj);
		}else if(obj instanceof Oper){
			drawOperationLine(cxt,obj);
		}else if(obj instanceof Subsequent){
			drawSubsequentLine(cxt,obj);
		}
	}
	
	/**
	 * 绘制一个活动的线条
	 */
	function drawActivityLine(cxt,act){
		//do nothing.
	}
	
	/**
	 * 绘制结果线中的线条
	 */
	function drawOperationLine(cxt,oper){
		var view = oper.view;
		if(oper.model.activityId){//如果关联了一个活动
			//console.log("oper.model.activityId:"+oper.model.activityId);
			//查找对应的活动
			var act = selectActByActId(oper.model.activityId);
			//绘制从结果到活动的线条。
			if(act){
			    //act.view
				cxt.beginPath();
				cxt.lineWidth=2;
				cxt.strokeStyle='#48f';
				cxt.moveTo(view.x+view.width/2,view.y+view.height/2);
				cxt.lineTo(act.view.x+act.view.width/2,act.view.y+act.view.height/2);
				cxt.stroke();
			}
		}else if(oper.view.controlPoint){//存在控制点
			 //绘制连线到控制点
			 cxt.beginPath();
			 cxt.lineWidth=2;
			 cxt.strokeStyle='#48f';
			 cxt.moveTo(view.x+view.width/2,view.y+view.height/2);
			 cxt.lineTo(oper.view.controlPoint.x,oper.view.controlPoint.y);
			 cxt.stroke();
		}
	}
	/**
	 * 绘制结果线中的线条
	 */
	function drawSubsequentLine(cxt,subseq){
		var view = subseq.view;
		if(subseq.model.activityId){//如果关联了一个活动
			//console.log("subseq.model.activityId:"+subseq.model.activityId);
			//查找对应的活动
			var act = selectActByActId(subseq.model.activityId);
			//绘制从圆圈到活动的线条。
			if(act){
			    //act.view
				cxt.beginPath();
				cxt.lineWidth=0.5;
				cxt.strokeStyle='black';
				cxt.moveTo(view.x+view.width/2-0.5,view.y+view.height/2-0.5);//由于像素精度问题所以每个坐标都要减0.5个像素
				cxt.lineTo(act.view.x+act.view.width/2-0.5,act.view.y+act.view.height/2-0.5);
				cxt.stroke();
			}
		}
		if(subseq.model.operationId){//如果关联了一个结果
			//console.log("subseq.model.activityId:"+subseq.model.operationId);
			//查找对应的结果
			var oper = selectOperByOperId(subseq.model.operationId);
			//绘制从圆圈到活动的结果。
			if(oper){
			    //act.view
				cxt.beginPath();
				cxt.lineWidth=0.5;
				cxt.strokeStyle='black';
				cxt.moveTo(view.x+view.width/2-0.5,view.y+view.height/2-0.5);
				cxt.lineTo(oper.view.x+oper.view.width/2-0.5,oper.view.y+oper.view.height/2-0.5);
				cxt.stroke();
			}
			
		}
		if(subseq.view.controlPoint){//存在控制点
			var controlPoint = subseq.view.controlPoint;
			//绘制连线到控制点
			cxt.beginPath();
			cxt.lineWidth=0.5;
			cxt.strokeStyle='black';
			cxt.moveTo(view.x+view.width/2-0.5,view.y+view.height/2-0.5);
			cxt.lineTo(controlPoint.x-0.5,controlPoint.y-0.5);
			cxt.stroke();
		}
		if(subseq.view.controlPoint1){//存在控制点
			var controlPoint = subseq.view.controlPoint1;
			//绘制连线到控制点
			cxt.beginPath();
			cxt.lineWidth=0.5;
			cxt.strokeStyle='black';
			cxt.moveTo(view.x+view.width/2-0.5,view.y+view.height/2-0.5);
			cxt.lineTo(controlPoint.x-0.5,controlPoint.y-0.5);
			cxt.stroke();
		}
	}
	
	/**
	 * 绘制一个业务对象
	 */
	function drawBizObj(cxt,obj){
		if(obj instanceof Act){
			drawActivity(cxt,obj);
		}else if(obj instanceof Oper){
			drawOperation(cxt,obj);
		}else if(obj instanceof Subsequent){
			drawSubsequent(cxt,obj);
		}
	}
	
	/**
	 * 绘制一个活动
	 */
	function drawActivity(cxt,act){
		//console.log("act.model:"+act.model);
		//绘制活动的名称
		//console.log("act.model.displayName:"+act.model.displayName);
		if(act.model.displayName){
			cxt.fillStyle = 'black';
			cxt.font = "bold 14px songti";
			var textLeft = act.view.x+(act.view.width-act.model.displayName.length*14)/2  //14是字体的宽度。
			cxt.fillText(act.model.displayName,textLeft,act.view.y-8);//文字写在图像上方8个像素点处。
		}
		cxt.drawImage(icons['act'],act.view.x,act.view.y);
	}
	/**
	 * 绘制一个结果线
	 */
	function drawOperation(cxt,oper){
		 var view = oper.view;
		 cxt.drawImage(icons['oper'],oper.view.x,oper.view.y);
		 //如果关联了一个活动
		 //console.log("oper.model.activityId:"+oper.model.activityId);
		 if(oper.model.activityId){
			 console.log("oper.model.activityId:"+oper.model.activityId);
			 //do nothing.
		 }else if(oper.view.controlPoint){//存在控制点
			 //在控制点处绘制一个鼠标。
			 var mouseLeft = oper.view.controlPoint.x - Math.floor(icons['mouse'].width/2);
			 var mouseTop = oper.view.controlPoint.y - Math.floor(icons['mouse'].height/2);
			 cxt.drawImage(icons['mouse'],mouseLeft,mouseTop);
		 }
		 cxt.fillStyle = 'black';
		 cxt.font = "12px songti";
		 var textLeft = oper.view.x+Math.floor((oper.view.width-oper.model.displayName.length*12)/2); //12是字体的宽度
	     cxt.fillText(oper.model.displayName,textLeft,oper.view.y+oper.view.height+12);//12是字体的高度
	 }
	/**
	 * 绘制一个后续线.
	 */
	function drawSubsequent(ctx,subseq){
		//后续线的中心点上绘制一个圆圈
		//先计算圆形的中心
		var x = subseq.view.x + Math.floor(subseq.view.width/2);
		var y = subseq.view.y + Math.floor(subseq.view.height/2);
		//半径是宽度的1/4
		var r = Math.floor(subseq.view.width/4);
		//console.log('arc: x:'+x+" y:"+y+ " r:"+r);
		//开始绘制
		ctx.beginPath();
	    //设置弧线的颜色为灰色
		ctx.lineWidth="0.5";
	    ctx.strokeStyle = "black";
		ctx.arc(x, y, r, 0, 2*Math.PI);
		ctx.closePath();
		ctx.fillStyle = "white";
		ctx.fill();
		ctx.stroke();
		//绘制控制点
		var controlPoint = subseq.view.controlPoint;
		if(controlPoint){
			 var mouseLeft = controlPoint.x - Math.floor(icons['mouse'].width/2);
			 var mouseTop = controlPoint.y - Math.floor(icons['mouse'].height/2);
			 cxt.drawImage(icons['mouse'],mouseLeft,mouseTop);
		}
		var controlPoint = subseq.view.controlPoint1;
		if(controlPoint){
			 var mouseLeft = controlPoint.x - Math.floor(icons['mouse'].width/2);
			 var mouseTop = controlPoint.y - Math.floor(icons['mouse'].height/2);
			 cxt.drawImage(icons['mouse'],mouseLeft,mouseTop);
		}
	}
	/**
	 * 绘制选中的元素
	 */
	function drawSelect(ctx){
		for(var i in selected){
			var view = selected[i].view;
			//console.log("draw selected.");
			ctx.beginPath();
			ctx.lineWidth="1";
			ctx.strokeStyle="green";
			ctx.rect(view.x,view.y,view.width,view.height);
			ctx.stroke();
		}
	}

	function drawReadMarked(ctx){
		if(redMarked){
			var view = redMarked.view;
			//console.log("draw red mark.");
			ctx.beginPath();
			ctx.lineWidth="1";
			ctx.strokeStyle="red";
			ctx.rect(view.x,view.y,view.width,view.height);
			ctx.stroke();
		}
	}
	
	/**
	 * 获取鼠标的位置，考虑坐标系
	 * @param event 事件
	 * @param canvase 元素
	 * @returns {x:x,y:y}
	 */
	function getCursorPos(event,c){
		var x = event.pageX-c.offsetLeft;
	    var y = event.pageY-c.offsetTop;
	    //按原点位置调整坐标系
	    x+=originPoint.x;
	    y+=originPoint.y;
	    return {x:x,y:y};
	}
	
	/**获取鼠标的位置，不考虑坐标系*/
	function getCursorAbsPos(event,c){
		var x = event.pageX-c.offsetLeft;
	    var y = event.pageY-c.offsetTop;
	    return {x:x,y:y};
	}
	
	/**
	 * 使整个流程图居中
	 */
	function _makeCenter(){
		var maxX = null;
		var minX = null;
		var maxY = null;
		var minY = null;
		
		for(var i in flowModle.activities){
			var x=flowModle.activities[i].view.x;
			var y=flowModle.activities[i].view.y;
			if(maxX==null){
				maxX = x;
			}else{
				maxX = Math.max(maxX,x);
			}
			if(minX==null){
				minX = x;
			}else{
				minX = Math.min(minX,x);
			}
			if(maxY==null){
				maxY = y;
			}else{
				maxY = Math.max(maxY,y);
			}
			if(minY==null){
				minY = y;
			}else{
				minY = Math.min(minY,y);
			}
		}
		
		for(var i in flowModle.operations){
			var x=flowModle.operations[i].view.x;
			var y=flowModle.operations[i].view.y;
			if(maxX==null){
				maxX = x;
			}else{
				maxX = Math.max(maxX,x);
			}
			if(minX==null){
				minX = x;
			}else{
				minX = Math.min(minX,x);
			}
			if(maxY==null){
				maxY = y;
			}else{
				maxY = Math.max(maxY,y);
			}
			if(minY==null){
				minY = y;
			}else{
				minY = Math.min(minY,y);
			}
		}
		
		for(var i in flowModle.subsequents){
			var x=flowModle.subsequents[i].view.x;
			var y=flowModle.subsequents[i].view.y;
			if(maxX==null){
				maxX = x;
			}else{
				maxX = Math.max(maxX,x);
			}
			if(minX==null){
				minX = x;
			}else{
				minX = Math.min(minX,x);
			}
			if(maxY==null){
				maxY = y;
			}else{
				maxY = Math.max(maxY,y);
			}
			if(minY==null){
				minY = y;
			}else{
				minY = Math.min(minY,y);
			}
		}
		
		if(maxX==null || minX==null || maxY==null || minY==null ){
			//只要有一个为空则无需处理坐标系
			return;
		}
		//获得了模型的中心点
		var centerX = (minX+maxX)/2;
		var centerY = (minY+maxY)/2;
		console.log("centerX:"+centerX);
		console.log("centerY:"+centerY);
		console.log("c.height:"+c.height);
		console.log("c.height/2:"+(c.height/2));
		//新的原点
		var x = Math.floor(centerX-c.width/2+0.5);//0.5的目的是为了四舍五入
		var y = Math.floor(centerY-c.height/2+0.5);
		console.log("x:"+x);
		console.log("y:"+y);
		originPoint.x=x;
		originPoint.y=y;
		drawAll(cxt);
	}
	
	/**当业务对象的属性发生变化时要处理的事情 */
	function _onValueChange(obj,prop,beforValue,value){
		if(obj instanceof Act){
			if(prop=='activityId' && beforValue){
				obj.model.baseId = value;
				var opers = selectOpersByActId(beforValue);
				for(var i in opers){
					opers[i].model.activityId = value;
					//TODO 如果activityId被改成空了就要把控制点恢复
				}
				var subseqs = selectSubseqByActId(beforValue);
				for(var i in subseqs){
					subseqs[i].model.activityId = value;
					//TODO 如果activityId被改成空了就要把控制点恢复
				}
			}
		}else if(obj instanceof Oper){
			if(prop=='operationId' && beforValue){
				obj.model.baseId = value;
				var subseqs = selectSubseqByOperId(beforValue);
				for(var i in subseqs){
					subseqs[i].model.operationId = value;
					//TODO 如果activityId被改成空了就要把控制点恢复
				}
			}
		}
	}
	
	/**（级联）删除一个业务对象*/
	function _deleteObj(obj){
		if(obj instanceof Act ){
			_deleteAct(obj);
		}else if(obj instanceof Oper){
			_deleteOper(obj)
		}else if(obj instanceof Subsequent){
			_deleteSubseq(obj)
		}
	}
	
	/**（级联）删除一个业务对象*/
	function _deleteAct(act){
		var index = flowModle.activities.indexOf(act);
		if(index>=0){
			flowModle.activities.splice(index,1);
		}
		//查一下有没有子对象，有则把它删除掉.
		if(act.model.activityId){
			var opers = selectOpersByActId(act.model.activityId);
			for(var i in opers){
				_deleteOper(opers[i]);
			}
			var subseqs = selectSubseqByActId(act.model.activityId);
			for(var i in subseqs){
				_deleteSubseq(subseqs[i]);
			}
		}
	}
	
	/**（级联）删除一个业务对象*/
	function _deleteOper(oper){
		var index = flowModle.operations.indexOf(oper);
		if(index>=0){
			flowModle.operations.splice(index,1);
		}
		//查一下有没有子对象，有则把它删除掉.
		if(oper.model.operationId){
			var subseqs = selectSubseqByOperId(oper.model.operationId);
			for(var i in subseqs){
				_deleteSubseq(subseqs[i]);
			}
		}
	}
	
	/**删除一个业务对象*/
	function _deleteSubseq(subseq){
		var index = flowModle.subsequents.indexOf(subseq);
		if(index>=0){
			flowModle.subsequents.splice(index,1);
		}
	}
	
	/**某字段是否存在重复*/
	function _isRepeate(obj,prop,value){
		if(obj instanceof Act){
			for(var i in flowModle.activities){
				var another =flowModle.activities[i];
				if(another===obj){
					continue;
				}
				var model = another.model;
				if(model[prop]==value){
					return true;
				}
			}
		}else if(obj instanceof Oper){
			for(var i in flowModle.operations){
				var another =flowModle.operations[i];
				if(another===obj){
					continue;
				}
				var model = another.model;
				if(model[prop]==value){
					return true;
				}
			}
		}
		return false;
	}
	
	
	//暴露出去一个对象
	var exportObj = {
		/**加载一个模型*/
		loadModel:function(modelJson){
			//先清空模型
			flowModle.activities = [];
			flowModle.operations = [];
			flowModle.subsequents = [];
			_clearSelected();
			for(var i in modelJson.activities){
				var act = new Act(modelJson.activities[i]);
				if(act.view.displayindex){
					maxDisplayindex = Math.max(maxDisplayindex,act.view.displayindex);
				}else{
					act.view.displayindex = ++maxDisplayindex;
				}
				//设置宽度和高度.
				act.view.width = icons['act'].width;
				act.view.height = icons['act'].height;
				flowModle.activities.push(act);
				console.log('加载了一个Act');
			}
			for(var i in modelJson.operations){
				var oper = new Oper(modelJson.operations[i]);
				if(oper.view.displayindex){
					maxDisplayindex = Math.max(maxDisplayindex,oper.view.displayindex);
				}else{
					oper.view.displayindex = ++maxDisplayindex;
				}
				//设置宽度和高度.
				oper.view.width = icons['oper'].width;
				oper.view.height = icons['oper'].height;
				flowModle.operations.push(oper);
			}
			for(var i in modelJson.subsequents){
				var subseq = new Subsequent(modelJson.subsequents[i]);
				if(subseq.view.displayindex){
					maxDisplayindex = Math.max(maxDisplayindex,oper.view.displayindex);
				}else{
					subseq.view.displayindex = ++maxDisplayindex;
				}
				//设置宽度和高度.
				subseq.view.width = icons['subseq'].width;
				subseq.view.height = icons['subseq'].height;
				flowModle.subsequents.push(subseq);
			}
			//加载完后渲染一下。放到另外一个线程去渲染，以保证图像已加载完成。由于浏览器加载图片是异步的，可能需要花较长时间，所以给他200毫秒去加载
			setTimeout(function(){console.log('开始绘图');drawAll(cxt);},200);
		},
		/**向模型中增加一个Act*/
		addAct:function(actJson){
			var act = new Act(actJson);
			act.view.displayindex=++maxDisplayindex;
			//设置宽度和高度.
			act.view.width = icons['act'].width;
			act.view.height = icons['act'].height;
			flowModle.activities.push(act);
			//新添加的对象设置为选中
			selected = [act];
			onSelect(act);
			drawAll(cxt);
		},
		/**向模型中增加一个Oper*/
		addOper:function(operJson){
			var oper = new Oper(operJson);
			oper.view.displayindex=++maxDisplayindex;
			//设置宽度和高度.
			oper.view.width = icons['oper'].width;
			oper.view.height = icons['oper'].height;
			flowModle.operations.push(oper);
			//新添加的对象设置为选中
			selected = [oper];
			onSelect(oper);
			drawAll(cxt);
		},
		addSubseq:function(subseqJson){
			var subseq = new Subsequent(subseqJson);
			//设置宽度和高度.
			subseq.view.width = icons['subseq'].width;
			subseq.view.height = icons['subseq'].height;
			flowModle.subsequents.push(subseq);
			//新添加的对象设置为选中
			selected = [subseq];
			onSelect(subseq);
			drawAll(cxt);
		},
		/**获取画布中心点的坐标*/
		getCenter:function(){
			var cwidth = $(c).attr('width').replace('px','');
			var cheight = $(c).attr('height').replace('px','');
			var x = Math.floor((cwidth)/2);
			var y = Math.floor((cheight)/2);
			//按坐标系调整
			x = x + originPoint.x;
			y = y + originPoint.y;
			return {x:x,y:y};
		},
		/**标红需要暴露出去*/
		getRedMarked:function(){
			return redMarked;
		},
		setRedMarked:function(rm){
			redMarked=rm;
		},
		/**把流程模型暴露出去*/
		getFlowModle:function(){
			//TODO : 应当深拷贝后再报露出去.
			return flowModle;
		},
		/**移动坐标系*/
		moveOriginPoint:function(dx,dy){
			originPoint.x-=dx;
			originPoint.y-=dy;
		},
		/**设置鼠标移动控制器*/
		setDragCtrl:function(ctrl){
			if(ctrl)
				dragCtrl = ctrl;
		},
		/**将鼠标控制器复原成默认*/
		resetDragCtrl:function(){
			dragCtrl = defualtDragCtrl;
		},
		/**使整个流程图居中显示*/
		makeCenter:function(){
			_makeCenter();
		},
		/**给业务对象的属性设值*/
		setVal:function(prop,value){
			//先找到选中的业务对象
			if(selected.length==0){
				return;
			}
			var obj = selected[selected.length-1];
			var model = obj.model;
			var beforeValue = model[prop];
			model[prop]=value;
			_onValueChange(obj,prop,beforeValue,value);
			//属性变了有可能影响图形外观
			drawAll(cxt);
		},
		/**删除一个选中的业务对象（同时级联删除他关联到的子对象）*/
		deleteSelected:function(){
			for(var i in selected){
				_deleteObj(selected[i]);
			}
			//删除后清空selected
			_clearSelected();
			//重绘一下
			drawAll(cxt);
		},
		/**判断某字段是否重复*/
		isRepeate:function(prop,value){
			if(selected.length==0){
				return false;
			}
			var obj = selected[selected.length-1];
			return _isRepeate(obj,prop,value);
		}
	};
	//设定鼠标拖动控制器
	defualtDragCtrl = getDefaultDragCtrl(exportObj);
	dragCtrl = defualtDragCtrl;
	return exportObj;
}


/**
 * 显示错误信息给用户
 * 如果不满意显示效果可以另写一个函数把它覆盖掉。
 * @returns
 */
function showErrMsg(msg){
	alert(msg);
}
