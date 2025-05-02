import os
import logging
from functools import wraps
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for, session
from models import db, Admin, ContactSubmission, NewsletterSubscription, Testimonial

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Configure the database
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    # If DATABASE_URL is not set or empty, log the error for troubleshooting
    logging.error("DATABASE_URL environment variable is not set or is empty")
    # Use a fallback SQLite database for development
    database_url = "sqlite:///airguide.db"
    logging.warning(f"Using fallback database: {database_url}")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the database
db.init_app(app)

# Create database tables if they don't exist
with app.app_context():
    db.create_all()
    
    # Check if admin user exists, if not create one
    admin = Admin.query.filter_by(username='admin').first()
    if not admin:
        admin = Admin(username='admin')
        admin.set_password('airguide2025')  # Default password, should be changed after first login
        db.session.add(admin)
        db.session.commit()
        logging.info("Admin user created with default credentials")
    
    logging.debug("Database tables created")

# Admin login required decorator
def admin_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            flash('Please log in to access the admin area.', 'warning')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Define routes
@app.route('/')
def index():
    # Get featured testimonials for homepage
    testimonials = Testimonial.query.filter_by(is_featured=True).limit(3).all()
    return render_template('index.html', testimonials=testimonials)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/technology')
def technology():
    return render_template('technology.html')

@app.route('/product')
def product():
    return render_template('product.html')

@app.route('/safety')
def safety():
    return render_template('safety.html')

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        try:
            # Process contact form submission
            new_submission = ContactSubmission(
                first_name=request.form.get('firstName'),
                last_name=request.form.get('lastName'),
                email=request.form.get('email'),
                phone=request.form.get('phone'),
                company=request.form.get('company'),
                inquiry_type=request.form.get('inquiry'),
                message=request.form.get('message')
            )
            db.session.add(new_submission)
            db.session.commit()
            flash('Thank you for your message! We will get back to you shortly.', 'success')
            return redirect(url_for('contact'))
        except Exception as e:
            logging.error(f"Error processing contact form: {str(e)}")
            flash('There was an error processing your request. Please try again.', 'danger')
    
    return render_template('contact.html')

@app.route('/api/subscribe', methods=['POST'])
def subscribe_newsletter():
    try:
        data = request.json
        email = data.get('email')
        name = data.get('name', '')
        
        # Check if email already exists
        existing = NewsletterSubscription.query.filter_by(email=email).first()
        if existing:
            if not existing.is_active:
                # Reactivate subscription
                existing.is_active = True
                db.session.commit()
                return jsonify({"success": True, "message": "Your subscription has been reactivated!"})
            return jsonify({"success": False, "message": "You are already subscribed to our newsletter."})
        
        # Create new subscription
        new_subscription = NewsletterSubscription(
            email=email,
            name=name
        )
        db.session.add(new_subscription)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Thank you for subscribing to our newsletter!"})
    except Exception as e:
        logging.error(f"Error subscribing to newsletter: {str(e)}")
        return jsonify({"success": False, "message": "There was an error processing your request."})

# Admin Routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if 'admin_logged_in' in session:
        return redirect(url_for('admin_dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and admin.check_password(password):
            session['admin_logged_in'] = True
            session['admin_username'] = admin.username
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
    
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
@admin_login_required
def admin_dashboard():
    # Get all contact submissions, ordered by newest first
    contact_submissions = ContactSubmission.query.order_by(ContactSubmission.created_at.desc()).all()
    
    # Get all newsletter subscriptions
    newsletter_subscriptions = NewsletterSubscription.query.order_by(NewsletterSubscription.subscribed_at.desc()).all()
    
    # Get all testimonials
    testimonials = Testimonial.query.order_by(Testimonial.created_at.desc()).all()
    
    return render_template(
        'admin/dashboard.html',
        contact_submissions=contact_submissions,
        newsletter_subscriptions=newsletter_subscriptions,
        testimonials=testimonials
    )

@app.route('/admin/toggle-subscription/<int:subscription_id>', methods=['POST'])
@admin_login_required
def admin_toggle_subscription(subscription_id):
    subscription = NewsletterSubscription.query.get_or_404(subscription_id)
    subscription.is_active = not subscription.is_active
    db.session.commit()
    
    status = "activated" if subscription.is_active else "deactivated"
    flash(f'Subscription for {subscription.email} has been {status}.', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/add-testimonial', methods=['POST'])
@admin_login_required
def admin_add_testimonial():
    name = request.form.get('name')
    position = request.form.get('position')
    company = request.form.get('company')
    testimonial_text = request.form.get('testimonial_text')
    is_featured = True if request.form.get('is_featured') else False
    
    new_testimonial = Testimonial(
        name=name,
        position=position,
        company=company,
        testimonial_text=testimonial_text,
        is_featured=is_featured
    )
    
    db.session.add(new_testimonial)
    db.session.commit()
    
    flash('New testimonial has been added successfully.', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/toggle-testimonial-feature/<int:testimonial_id>', methods=['POST'])
@admin_login_required
def admin_toggle_testimonial_feature(testimonial_id):
    testimonial = Testimonial.query.get_or_404(testimonial_id)
    testimonial.is_featured = not testimonial.is_featured
    db.session.commit()
    
    status = "featured" if testimonial.is_featured else "unfeatured"
    flash(f'Testimonial by {testimonial.name} has been {status}.', 'success')
    return redirect(url_for('admin_dashboard'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
