const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");


const list = (req, res) => {
    res.json({ data: orders });
};

const hasValidProperty = (property) => {
    return (req, res, next) => {
      const { data = {} } = req.body;
      if (property === "id") {
        const { orderId } = req.params;
        data[property] === orderId || !data[property]
          ? next()
          : next({
              status: 400,
              message: `Order id does not match route id. Order: ${data[property]}, Route: ${orderId}.`,
            });
      }
      if (property === "status") {
        const status = data[property];
        if (!status || status === "invalid") {
          next({
            status: 400,
            message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
          });
        } else if (status === "delivered") {
          next({ status: 400, message: "A delivered order cannot be changed" });
        }
        next();
      }
      if (data[property]) {
        if (property === "dishes") {
          const dishes = data[property];
          if (dishes.length > 0 && Array.isArray(dishes)) {
            dishes.map((dish, index) => {
              if (
                !dish.quantity ||
                dish.quantity <= 0 ||
                dish.quantity !== Number(dish.quantity)
              ) {
                next({
                  status: 400,
                  message: `Dish ${index} must have a quantity that is an integer greater than 0`,
                });
              }
            });
          } else {
            next({
              status: 400,
              message: `Order must include at least one dish`,
            });
          }
        }
        next();
      } else {
        next({
          status: 400,
          message: `Order must include a ${property}`,
        });
      }
    };
};

function createOrder(req, res) => {
    const { data: { deliverTo, mobileNumber, status, dishes } } = req.body;
    const id = nextId();

    const newOrder = {
        id,
        deliverTo,
        mobileNumber,
        status,
        dishes,
    }
    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
}

function readOrder(req, res) => {
    const foundOrder = res.locals.order;

    res.json({ data: foundOrder });
}

function orderExists(req,res,next) => {
    const { orderId } = req.params;
    const foundOrder = orders.find((order) => order.id == orderId);
    
    if(foundOrder) {
        res.locals.order = foundOrder
        return next();
    }
    next({ status: 404, message: `Order id does not exist: ${ orderId }`});
}

function deleteValidator(req, res, next) => {
    const foundOrder = res.locals.order;
    
    if(foundOrder.status == "pending"){
        return next()
    }
    next({ status: 400, message: "An order cannot be deleted unless it is pending"});
}

function updateOrder(req,res) => {
  const orderId = req.params.orderId;
  const order = res.locals.order;
  if (!order.id) {
    order.id = orderId;
  }
  res.json({ data: order });
}


function destroyOrder(req,res) => {
    const { orderId } = req.params;
    const index = orders.findIndex((order) => order.id == orderId);

    if(index > -1) {
        orders.splice(index,1);
    }
    res.sendStatus(204);
}

module.exports = {
    list,
    create: [
      hasValidProperty("deliverTo"),
      hasValidProperty("mobileNumber"),
      hasValidProperty("dishes"),
      createOrder,
    ],
    update: [
      orderExists,
      hasValidProperty("deliverTo"),
      hasValidProperty("mobileNumber"),
      hasValidProperty("dishes"),
      hasValidProperty("id"),
      hasValidProperty("status"),
      updateOrder,  
    ],
    read: [orderExists, readOrder],
    delete: [orderExists,deleteValidator,destroyOrder],
};
