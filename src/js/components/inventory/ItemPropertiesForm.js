'use strict';

import {h} from 'preact'
import React, {
    Component, PureComponent
}
from 'react';
import PropTypes from 'prop-types'
import ItemPropertiesFormCSS from './ItemPropertiesForm.scss'
import ColorPicker from 'react-color-picker'
//import ColorPicker from 'rc-color-picker'
//var ColorPicker = require('rc-color-picker');
//import ColorPicker from 'material-ui-rc-color-picker';
//import 'material-ui-rc-color-picker/assets/index.css';

export default class ItemPropertiesForm extends Component {
    static propTypes = {
        name:PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
        color: PropTypes.string,
        fontSize: PropTypes.string,
        onChange: PropTypes.func.isRequired
    }
    static defaultProps = {
        name:'item',
        width:1,
        height:1,
        color:'aqua',
        fontSize:'0.3',
        onChange:()=>{}
    }
    constructor(props, context) {
        super(props, context)
        
        this.state = {
            name:props.name,
            width:props.width,
            height:props.height,
            color:props.color,
            fontSize:props.fontSize,
            enableColorPicker:false
        }
        this.onSetColor=this.onSetColor.bind(this)
    }
    componentWillReceiveProps(props) {
        this.setState({
            name:props.name,
            width:props.width,
            height:props.height,
            color:props.color,
            fontSize:props.fontSize
        })
    }
    update(newProps) {
        const newState = Object.assign(this.state, newProps)
        this.setState(newState)
        if (this.props.onChange) this.props.onChange(newProps)
    }
    onName(e) {
        this.update({name:e.target.value})
    }
    onWidth(e) {
        this.update({width:Number(e.target.value)})
    }
    onHeight(e) {
        this.update({height:Number(e.target.value)})
    }
    onColor(e) {
        this.update({color:e.target.value})
    }
    onSelectColor(e) {
        this.setState({enableColorPicker:!this.state.enableColorPicker})
    }
    onSetColor(color, c) {
        this.update({color:color})
    }
     onFontSize(e) {
        this.update({fontSize:e.target.value})
    }

    /*
        <ColorPicker color={this.state.color} onChange={this.onSetColor.bind(this)}>
        <div>test</div>
        </ColorPicker>
    */

    render() {
        var colorPicker = null
        if (this.state.enableColorPicker) {
            colorPicker = (
                <div style={{position:'relative',display:'inline-block',backgroundColor:'#ffffff',width:'200px',zIndex:'11000'}}>
                    <ColorPicker
                        value={this.state.color}
                        onDrag={this.onSetColor.bind(this)}
                        saturationWidth={150}
                        saturationHeight={150}
                        huewidth={150}
                        hueHeight={150}
                    />
                </div>
            )
        }
        return(
            <form className="pure-form" style={{textAlign:'left'}}>
                <label>Name</label><input onChange={this.onName.bind(this)} type='text' value={this.state.name} style={{width:160}}/>
                <br/>
                <label>Color</label><span onClick={this.onSelectColor.bind(this)} style={{backgroundColor:this.state.color}}>{this.state.color}
                {colorPicker}
                </span>
                <br/>
                <label>Width</label><input onChange={this.onWidth.bind(this)} type='text' value={this.state.width} style={{width:80}}/>
                <br/>
                <label>Height</label><input onChange={this.onHeight.bind(this)} type='text' value={this.state.height} style={{width:80}}/>
                <br/>
                <label>Font Size</label><input onChange={this.onFontSize.bind(this)} type='text' value={this.state.fontSize} style={{width:80}}/>
            </form>
        )
    }
}
