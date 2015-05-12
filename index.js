var request = require("request");
var moment = require("moment");
var _ = require("underscore");
var dotty = require("dotty");

var Sixworks = function(settings){

    var url = settings.url;
    var key = settings.key;
    var webhook_url = settings.webhook_url;

    var sixworks = {};

    sixworks.request = function(order, callback){
        request({
            "method": "post",
            "url": url,
            "json": sixworks.merger(order)
        },function(error, response, body){
            if(error) return callback(error);
            if(response.statusCode !== 200) return callback(new Error("invalid status code "+response.statusCode));
            if(!body) return callback(new Error("no body"));
            if(dotty.exists(body, "error") && body.error.length !== 0) return callback(new Error(body.error));
            if(body.success) return callback(null, body);
            return callback(new Error("sixworks fell through"));
        });
    };

    sixworks.merger = function(order){
        var request = {
            "api_key":key,
            "test":false,
            "allow_preorder":true, // ?
            "update_stock":true, // ?
            "order":{
                "client_ref": order.order_number,
                "po_number": order.name,
                "date_placed": moment(order.created_at).format("MM/DD/YYYY HH:MM:SS"),
                "postage_speed":2, // ?
                "signed_for":0, // ?
                "postage_cost": _.reduce(order.shipping_lines,function(memo, object){return parseFloat(object.price) + memo;},0),
                "callback_url": webhook_url+"/order_fulfilled/"+order.token,
                //"callback_url": "http://requestb.in/1hxymmv1",
                "ShippingContact":{
                    "name":order.shipping_address.first_name+" "+order.shipping_address.last_name,
                    "company":order.shipping_address.company,
                    "email":order.customer.email,
                    "phone":order.shipping_address.phone,
                    "address":order.shipping_address.address1,
                    "address_contd":order.shipping_address.address2,
                    "city":order.shipping_address.city,
                    "county":order.shipping_address.province,
                    "country":order.shipping_address.country,
                    "postcode":order.shipping_address.zip,
                    "dear":order.shipping_address.first_name
                },
                "BillingContact":{
                    "name":order.billing_address.first_name+" "+order.billing_address.last_name,
                    "company":order.billing_address.company,
                    "email":order.customer.email,
                    "phone":order.billing_address.phone,
                    "address":order.billing_address.address1,
                    "address_contd":order.billing_address.address2,
                    "city":order.billing_address.city,
                    "county":order.billing_address.province,
                    "country":order.billing_address.country,
                    "postcode":order.billing_address.zip,
                    "dear":order.billing_address.first_name
                },
                "items": function(){
                    var sixworks_line_items = _.filter(order.line_items, function(line_item){
                        if(line_item.fulfillment_service.toLowerCase() == "sixworks") return true;
                    });
                    var for_sixworks = _.map(sixworks_line_items, function(line_item){
                        var product = {};
                        product.client_ref = line_item.sku;
                        product.quantity = line_item.quantity;
                        product.price = line_item.price;
                        return product;
                    });
                    return for_sixworks;
                }(),
                "total_value":order.total_line_items_price,
            }
        };
        return request;
    };

    return sixworks;

};

module.exports = Sixworks;